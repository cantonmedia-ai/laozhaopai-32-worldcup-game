import { PageShell, SectionHeader } from "@/components/app-shell";
import {
  RoadToChampionGame,
  type RoadPrediction,
  type RoadStage,
  type RoadTeam,
} from "@/components/road-to-champion-game";
import { requireCompletedProfile } from "@/lib/auth-guards";
import { getCurrentRound, teams as demoTeams } from "@/lib/demo-data";
import { sortRoadStages, type RoadStageKey } from "@/lib/road-to-champion";
import { stageInlineName } from "@/lib/stage-labels";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

type RankingRow = {
  user_id: string;
  total_points: number;
  rank_position: number;
};

function demoStages(): RoadStage[] {
  return sortRoadStages([
    {
      stage_key: "last_16",
      stage_name: stageInlineName("last_16"),
      required_selection_count: 16,
      points_per_correct: 2,
      perfect_bonus_points: 20,
      due_at: "2026-06-28T15:59:00.000Z",
      status: "open",
    },
    {
      stage_key: "last_8",
      stage_name: stageInlineName("last_8"),
      required_selection_count: 8,
      points_per_correct: 4,
      perfect_bonus_points: 20,
      due_at: "2026-07-02T15:59:00.000Z",
      status: "draft",
    },
    {
      stage_key: "last_4",
      stage_name: stageInlineName("last_4"),
      required_selection_count: 4,
      points_per_correct: 8,
      perfect_bonus_points: 20,
      due_at: "2026-07-06T15:59:00.000Z",
      status: "draft",
    },
    {
      stage_key: "finalists",
      stage_name: stageInlineName("final"),
      required_selection_count: 2,
      points_per_correct: 15,
      perfect_bonus_points: 20,
      due_at: "2026-07-10T15:59:00.000Z",
      status: "draft",
    },
    {
      stage_key: "champion",
      stage_name: "Champion",
      required_selection_count: 1,
      points_per_correct: 30,
      perfect_bonus_points: 0,
      due_at: "2026-07-13T15:59:00.000Z",
      status: "draft",
    },
  ] as RoadStage[]);
}

function demoRoadTeams(): RoadTeam[] {
  return demoTeams.slice(0, 32).map((team) => ({
    id: team.id,
    country_name: team.name,
    country_code: team.shortName,
    flag_url: team.flagImage,
    flag_asset_path: team.flagImage,
  }));
}

export default async function RoadToChampionPage() {
  const profile = await requireCompletedProfile("/road-to-champion");
  let stages = demoStages();
  let teams = demoRoadTeams();
  let predictions: RoadPrediction[] = [];
  let totalPoints = 0;
  let rank: number | null = null;
  let referralCount = 0;
  let referralPoints = 0;

  if (hasSupabaseServerEnv() && profile) {
    const supabase = await createClient();

    const { data: stageRows } = await supabase
      .from("prediction_stages")
      .select(
        "stage_key, stage_name, required_selection_count, points_per_correct, perfect_bonus_points, due_at, status",
      );

    if (stageRows?.length) {
      stages = sortRoadStages(stageRows as RoadStage[]);
    }

    const { data: teamRows } = await supabase
      .from("tournament_teams")
      .select(
        "seed_position, teams!inner(id, country_name, country_code, flag_url, flag_asset_path), tournaments!inner(name)",
      )
      .eq("stage", "last_32")
      .eq("tournaments.name", "FIFA World Cup 2026")
      .order("seed_position", { ascending: true });

    if (teamRows?.length) {
      teams = teamRows.map((row) => {
        const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
        return {
          id: team.id,
          country_name: team.country_name,
          country_code: team.country_code,
          flag_url: team.flag_url,
          flag_asset_path: team.flag_asset_path,
        };
      }) as RoadTeam[];
    }

    const { data: predictionRows } = await supabase
      .from("user_stage_predictions")
      .select(
        "stage_key, selected_team_ids, status, points_earned, correct_count, bonus_earned",
      )
      .eq("user_id", profile.auth_user_id);

    predictions = (predictionRows ?? []).map((row) => ({
      stage_key: row.stage_key as RoadStageKey,
      selected_team_ids: (row.selected_team_ids ?? []) as string[],
      status: row.status,
      points_earned: row.points_earned,
      correct_count: row.correct_count,
      bonus_earned: row.bonus_earned,
    })) as RoadPrediction[];

    const { data: pointRows } = await supabase
      .from("point_transactions")
      .select("source_type, points")
      .eq("user_id", profile.auth_user_id);

    totalPoints = (pointRows ?? []).reduce(
      (sum, row) => sum + Number(row.points ?? 0),
      0,
    );
    referralPoints = (pointRows ?? [])
      .filter((row) => row.source_type === "referral")
      .reduce((sum, row) => sum + Number(row.points ?? 0), 0);

    const { count } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_profile_id", profile.id);
    referralCount = count ?? 0;

    const { data: rankingRows } = await supabase.rpc(
      "get_road_to_champion_leaderboard",
      { p_limit: 500 },
    );
    rank =
      ((rankingRows ?? []) as RankingRow[]).find(
        (row) => row.user_id === profile.auth_user_id,
      )?.rank_position ?? null;
  }

  const round = getCurrentRound();

  return (
    <PageShell active="/road-to-champion">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <SectionHeader
          eyebrow={`${round.labelCn} Road Game`}
          title="Road to Champion Prediction"
          body="Predict which teams will reach each stage. Submit before the due date. The closer your prediction, the more points you earn."
        />
        <RoadToChampionGame
          stages={stages}
          teams={teams}
          predictions={predictions}
          summary={{
            totalPoints,
            rank,
            referralCode: profile?.referral_code ?? "",
            referralCount,
            referralPoints,
          }}
        />
      </main>
    </PageShell>
  );
}
