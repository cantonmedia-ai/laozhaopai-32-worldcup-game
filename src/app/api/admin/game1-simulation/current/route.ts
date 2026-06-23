import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

const playerNames: Record<number, string> = {
  1: "乌龙王",
  2: "神猜哥",
  3: "反向明灯",
  4: "绝杀佬",
  5: "加时王",
  6: "越位哥",
  7: "点球侠",
  8: "香蕉脚",
  9: "门柱之子",
  10: "玄学大师",
};

const stageOrder = ["last_16", "last_8", "last_4", "finalists", "champion"] as const;

type ProfileRow = {
  id: string;
  auth_user_id: string;
  email: string | null;
};

type MemberRow = {
  team_id: string;
  profile_id: string;
};

type PredictionRow = {
  user_id: string;
  stage_key: string;
  selected_team_ids: string[];
  correct_count: number;
  personal_correct_score: number;
  team_accumulated_score: number;
  final_earned_score: number;
  status: string;
};

type StageResultRow = {
  stage_key: string;
  official_team_ids: string[];
};

type TeamRow = {
  id: string;
  country_name: string | null;
  name: string;
};

function sortOrder(profile: ProfileRow) {
  const match = String(profile.email ?? "").match(/game1-sim-(\d+)@/);
  return match ? Number(match[1]) : 999;
}

function teamName(order: number) {
  return order <= 5 ? "乌龙王的第1队" : "越位哥的第1队";
}

function stageValue(
  rows: PredictionRow[],
  key: string,
  field: "correct_count" | "personal_correct_score",
) {
  return Number(rows.find((row) => row.stage_key === key)?.[field] ?? 0);
}

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;

  if (!hasSupabaseServiceEnv()) {
    return NextResponse.json(
      { error: "Supabase service role is not configured." },
      { status: 500 },
    );
  }

  const supabase = createServiceClient();
  const [
    profilesResponse,
    membersResponse,
    predictionsResponse,
    resultsResponse,
    teamsResponse,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, auth_user_id, email")
      .eq("is_simulation", true),
    supabase
      .from("squad_team_members")
      .select("team_id, profile_id")
      .eq("is_simulation", true),
    supabase
      .from("user_stage_predictions")
      .select(
        "user_id, stage_key, selected_team_ids, correct_count, personal_correct_score, team_accumulated_score, final_earned_score, status",
      )
      .eq("is_simulation", true),
    supabase
      .from("stage_results")
      .select("stage_key, official_team_ids")
      .eq("is_simulation", true),
    supabase.from("teams").select("id, country_name, name"),
  ]);

  const error =
    profilesResponse.error ??
    membersResponse.error ??
    predictionsResponse.error ??
    resultsResponse.error ??
    teamsResponse.error;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profiles = (profilesResponse.data ?? []) as ProfileRow[];
  const members = (membersResponse.data ?? []) as MemberRow[];
  const predictions = (predictionsResponse.data ?? []) as PredictionRow[];
  const results = (resultsResponse.data ?? []) as StageResultRow[];
  const teams = (teamsResponse.data ?? []) as TeamRow[];
  const teamNameById = new Map(
    teams.map((team) => [team.id, team.country_name ?? team.name]),
  );

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const memberByProfile = new Map(members.map((member) => [member.profile_id, member]));
  const predictionsByUser = new Map<string, PredictionRow[]>();
  for (const prediction of predictions) {
    const current = predictionsByUser.get(prediction.user_id) ?? [];
    current.push(prediction);
    predictionsByUser.set(prediction.user_id, current);
  }

  const playerScores = profiles
    .map((profile) => {
      const order = sortOrder(profile);
      const rows = predictionsByUser.get(profile.auth_user_id) ?? [];
      return {
        nickname: playerNames[order] ?? `模拟玩家 ${order}`,
        team_name: teamName(order),
        sort_order: order,
        last_16_correct_count: stageValue(rows, "last_16", "correct_count"),
        last_16_points: stageValue(rows, "last_16", "personal_correct_score"),
        last_8_correct_count: stageValue(rows, "last_8", "correct_count"),
        last_8_points: stageValue(rows, "last_8", "personal_correct_score"),
        last_4_correct_count: stageValue(rows, "last_4", "correct_count"),
        last_4_points: stageValue(rows, "last_4", "personal_correct_score"),
        finalists_correct_count: stageValue(rows, "finalists", "correct_count"),
        finalists_points: stageValue(rows, "finalists", "personal_correct_score"),
        champion_correct_count: stageValue(rows, "champion", "correct_count"),
        champion_points: stageValue(rows, "champion", "personal_correct_score"),
        game1_individual_score: rows.reduce(
          (sum, row) => sum + Number(row.personal_correct_score ?? 0),
          0,
        ),
        game1_team_accumulated_score: rows.reduce(
          (sum, row) => sum + Number(row.team_accumulated_score ?? 0),
          0,
        ),
        game1_final_earned_score: rows.reduce(
          (sum, row) => sum + Number(row.final_earned_score ?? 0),
          0,
        ),
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  const teamSummary = [1, 2].map((teamNo) => {
    const min = teamNo === 1 ? 1 : 6;
    const max = teamNo === 1 ? 5 : 10;
    const teamPlayers = playerScores.filter(
      (player) => player.sort_order >= min && player.sort_order <= max,
    );
    return {
      team_name: teamNo === 1 ? "乌龙王的第1队" : "越位哥的第1队",
      member_count: teamPlayers.length,
      members: teamPlayers.map((player) => player.nickname),
      game1_team_accumulated_score: teamPlayers.reduce(
        (sum, player) => sum + player.game1_individual_score,
        0,
      ),
    };
  });

  const rawOfficial = Object.fromEntries(
    results.map((result) => [
      result.stage_key,
      (result.official_team_ids ?? []).map((id) => teamNameById.get(id) ?? id),
    ]),
  );

  const rawPredictions = profiles
    .map((profile) => {
      const order = sortOrder(profile);
      const rows = predictionsByUser.get(profile.auth_user_id) ?? [];
      return {
        nickname: playerNames[order] ?? `模拟玩家 ${order}`,
        picks: Object.fromEntries(
          stageOrder.map((stage) => {
            const row = rows.find((item) => item.stage_key === stage);
            return [
              stage,
              (row?.selected_team_ids ?? []).map((id) => teamNameById.get(id) ?? id),
            ];
          }),
        ),
      };
    })
    .sort((a, b) => {
      const aOrder =
        Number(Object.entries(playerNames).find(([, name]) => name === a.nickname)?.[0]) ||
        999;
      const bOrder =
        Number(Object.entries(playerNames).find(([, name]) => name === b.nickname)?.[0]) ||
        999;
      return aOrder - bOrder;
    });

  return NextResponse.json({
    ok: true,
    message: "游戏一模拟测试完成。分数已由真实游戏一计分逻辑自动生成。",
    validation: {
      player_count: playerScores.length,
      team_count: teamSummary.filter((team) => team.member_count > 0).length,
      bad_team_count: teamSummary.filter((team) => team.member_count !== 5).length,
      missing_pick_count: playerScores.filter(
        (player) => (predictionsByUser.get(
          profiles.find((profile) => sortOrder(profile) === player.sort_order)
            ?.auth_user_id ?? "",
        ) ?? []).length !== 5,
      ).length,
      official_result_count: results.length,
    },
    player_scores: playerScores,
    team_summary: teamSummary,
    raw: {
      official_result: rawOfficial,
      player_predictions: rawPredictions,
      team_members: teamSummary,
      calculated_json: playerScores,
      database_member_rows: members.map((member) => ({
        team_id: member.team_id,
        profile_id: member.profile_id,
        player: playerNames[sortOrder(profileById.get(member.profile_id)!)] ?? "-",
        display_team: teamName(sortOrder(profileById.get(member.profile_id)!)),
        database_team_id: memberByProfile.get(member.profile_id)?.team_id,
      })),
    },
  });
}
