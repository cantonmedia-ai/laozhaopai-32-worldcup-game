import { PageShell, SectionHeader } from "@/components/app-shell";
import {
  KnockoutDbGame,
  type KnockoutMatch,
  type KnockoutPrediction,
} from "@/components/knockout-db-game";
import { requireCompletedProfile } from "@/lib/auth-guards";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import {
  knockoutWinnerDescription,
  knockoutWinnerNameCn,
  knockoutWinnerNameEn,
  knockoutWinnerSubtitle,
} from "@/lib/knockout-winner";

export default async function PredictPage() {
  const profile = await requireCompletedProfile("/predict");
  let dbMatches: KnockoutMatch[] = [];
  let predictions: KnockoutPrediction[] = [];
  let totalPoints = 0;
  let ranking: number | null = null;

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

    const { data: predictionRows } = await supabase
      .from("solo_match_predictions")
      .select("match_id, selected_winner_team_id, points_earned, is_correct, status")
      .eq("user_id", profile.auth_user_id);

    predictions = (predictionRows ?? []) as KnockoutPrediction[];

    const { data: pointRows } = await supabase
      .from("point_transactions")
      .select("points")
      .eq("user_id", profile.auth_user_id)
      .eq("source_type", "knockout_winner_challenge");

    totalPoints = (pointRows ?? []).reduce(
      (sum, row) => sum + Number(row.points ?? 0),
      0,
    );

    const { data: allPointRows } = await supabase
      .from("point_transactions")
      .select("user_id, points")
      .eq("source_type", "knockout_winner_challenge");

    const ranked = Object.entries(
      (allPointRows ?? []).reduce<Record<string, number>>((acc, row) => {
        acc[String(row.user_id)] = (acc[String(row.user_id)] ?? 0) + Number(row.points ?? 0);
        return acc;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .map(([userId], index) => ({ userId, rank: index + 1 }));
    ranking = ranked.find((row) => row.userId === profile.auth_user_id)?.rank ?? null;
  }

  return (
    <PageShell active="/predict">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeader
          eyebrow="Knockout Winner Challenge"
          title={
            <>
              {knockoutWinnerNameCn}
              <br />
              <span className="text-2xl md:text-3xl">{knockoutWinnerNameEn}</span>
            </>
          }
          body={`${knockoutWinnerSubtitle} ${knockoutWinnerDescription}`}
        />
        {dbMatches.length ? (
          <KnockoutDbGame
            mode="solo"
            matches={dbMatches}
            predictions={predictions}
            totalPoints={totalPoints}
            ranking={ranking}
          />
        ) : (
          <div className="grid gap-4 rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#0f8a4b]">
              小组赛进行中 / Group Stage in Progress
            </p>
            <h2 className="text-3xl font-black text-slate-950">
              32强名单确认中，预测即将开放。
            </h2>
            <p className="max-w-2xl font-semibold text-slate-600">
              Game 2 will open only after Round of 32 fixtures are detected and
              admin publishes them. Please play Game 1 first or form a team now.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href="/road-to-champion"
                className="flex h-12 items-center justify-center rounded bg-[#d71920] font-black text-white"
              >
                Start Game 1 / 开始预测
              </a>
              <a
                href="/squad"
                className="flex h-12 items-center justify-center rounded bg-[#071525] font-black text-white"
              >
                Create / Join Team
              </a>
            </div>
          </div>
        )}
      </main>
    </PageShell>
  );
}
