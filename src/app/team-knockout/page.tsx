import { PageShell, SectionHeader } from "@/components/app-shell";
import {
  KnockoutDbGame,
  type KnockoutMatch,
  type KnockoutPrediction,
} from "@/components/knockout-db-game";
import { requireCompletedProfile } from "@/lib/auth-guards";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

type MemberRow = {
  role: string;
  user_id: string;
};

type ProfileRow = {
  auth_user_id: string;
  nickname: string | null;
  display_name: string | null;
};

export default async function TeamKnockoutPage() {
  const profile = await requireCompletedProfile("/team-knockout");
  let dbMatches: KnockoutMatch[] = [];
  let predictions: KnockoutPrediction[] = [];
  let teamContext = null;

  if (hasSupabaseServerEnv() && profile) {
    const supabase = await createClient();
    const { data: rows } = await supabase
      .from("knockout_matches")
      .select(
        "id, round_key, match_number, match_start_at, prediction_lock_at, actual_winner_team_id, status, knockout_rounds!inner(round_name), team_a:team_a_id(id, country_name, country_code, flag_url, flag_asset_path), team_b:team_b_id(id, country_name, country_code, flag_url, flag_asset_path)",
      )
      .in("status", ["open", "locked", "scored", "completed"])
      .order("match_start_at", { ascending: true });

    dbMatches = (rows ?? []).map((row) => {
      const round = Array.isArray(row.knockout_rounds)
        ? row.knockout_rounds[0]
        : row.knockout_rounds;
      const teamA = Array.isArray(row.team_a) ? row.team_a[0] : row.team_a;
      const teamB = Array.isArray(row.team_b) ? row.team_b[0] : row.team_b;
      return {
        id: row.id,
        round_key: row.round_key,
        round_name: round?.round_name ?? row.round_key,
        match_number: row.match_number,
        match_start_at: row.match_start_at,
        prediction_lock_at: row.prediction_lock_at,
        actual_winner_team_id: row.actual_winner_team_id,
        status: row.status,
        team_a: teamA,
        team_b: teamB,
      };
    }) as KnockoutMatch[];

    const { data: member } = await supabase
      .from("game_team_members")
      .select("team_id, role, game_teams(id, team_name, team_code)")
      .eq("user_id", profile.auth_user_id)
      .eq("status", "active")
      .maybeSingle();

    if (member?.team_id) {
      const { data: predictionRows } = await supabase
        .from("team_match_predictions")
        .select("match_id, selected_winner_team_id, points_earned, is_correct, status")
        .eq("user_id", profile.auth_user_id)
        .eq("team_id", member.team_id);

      predictions = (predictionRows ?? []) as KnockoutPrediction[];

      const { data: summary } = await supabase
        .from("team_score_summary")
        .select("total_points, active_member_count, average_score, ranking_position")
        .eq("team_id", member.team_id)
        .maybeSingle();

      const { data: members } = await supabase
        .from("game_team_members")
        .select("role, user_id")
        .eq("team_id", member.team_id)
        .eq("status", "active");

      const memberRows = (members ?? []) as MemberRow[];
      const memberUserIds = memberRows.map((item) => item.user_id);
      const { data: memberProfiles } = memberUserIds.length
        ? await supabase
            .from("profiles")
            .select("auth_user_id, nickname, display_name")
            .in("auth_user_id", memberUserIds)
        : { data: [] };
      const profileByUserId = new Map(
        ((memberProfiles ?? []) as ProfileRow[]).map((item) => [
          item.auth_user_id,
          item,
        ]),
      );

      const { data: contributionRows } = await supabase
        .from("team_match_predictions")
        .select("points_earned")
        .eq("team_id", member.team_id)
        .eq("user_id", profile.auth_user_id)
        .eq("status", "scored");

      const gameTeam = Array.isArray(member.game_teams)
        ? member.game_teams[0]
        : member.game_teams;

      teamContext = {
        id: member.team_id as string,
        team_name: gameTeam?.team_name ?? "My Team",
        team_code: gameTeam?.team_code ?? "",
        role: member.role as string,
        members: memberRows.map((item) => ({
          nickname:
            profileByUserId.get(item.user_id)?.nickname ||
            profileByUserId.get(item.user_id)?.display_name ||
            "Player",
          role: item.role,
        })),
        total_points: Number(summary?.total_points ?? 0),
        active_member_count: Number(summary?.active_member_count ?? 0),
        average_score: Number(summary?.average_score ?? 0),
        ranking_position: summary?.ranking_position ?? null,
        personal_contribution: (contributionRows ?? []).reduce(
          (sum, row) => sum + Number(row.points_earned ?? 0),
          0,
        ),
      };
    }
  }

  return (
    <PageShell active="/team-knockout">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeader
          eyebrow="Team Knockout Winner Challenge"
          title={
            <>
              团队淘汰赛赢家战
              <br />
              <span className="text-2xl md:text-3xl">
                Team Knockout Winner Challenge
              </span>
            </>
          }
          body="加入团队一起预测每一轮赢家，团队积分冲榜赢大奖。"
        />
        <KnockoutDbGame
          mode="team"
          matches={dbMatches}
          predictions={predictions}
          totalPoints={teamContext?.personal_contribution ?? 0}
          ranking={teamContext?.ranking_position ?? null}
          teamContext={teamContext}
        />
      </main>
    </PageShell>
  );
}
