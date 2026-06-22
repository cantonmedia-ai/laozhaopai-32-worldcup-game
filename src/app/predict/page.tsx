import { PageShell, SectionHeader } from "@/components/app-shell";
import {
  KnockoutDbGame,
  type KnockoutMatch,
  type KnockoutPrediction,
} from "@/components/knockout-db-game";
import { PredictionBoard } from "@/components/prediction-board";
import { getCurrentMatches } from "@/lib/demo-data";
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
  const matches = getCurrentMatches();
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
          <>
            <div className="mb-5 rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
              Next round matches will unlock after admin confirms the previous round winners.
            </div>
            <PredictionBoard matches={matches} />
          </>
        )}
      </main>
    </PageShell>
  );
}
