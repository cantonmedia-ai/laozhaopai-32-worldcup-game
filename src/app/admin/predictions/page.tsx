import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { ApiMatchSyncAdmin } from "@/components/api-match-sync-admin";
import { Game2SimulationAdmin } from "@/components/game2-simulation-admin";
import { knockoutWinnerAdminTitle } from "@/lib/knockout-winner";
import {
  createServiceClient,
  hasSupabaseServiceEnv,
} from "@/lib/supabase/service";

type PredictionRow = {
  id: string;
  user_id: string;
  match_id: string;
  selected_winner_team_id: string;
  predicted_team_a_score: number | null;
  predicted_team_b_score: number | null;
  individual_match_score: number | null;
  team_accumulated_score: number | null;
  final_earned_score: number | null;
  status: string;
  submitted_at: string;
};

type ProfileRow = {
  auth_user_id: string;
  display_name: string | null;
  nickname: string | null;
  email: string | null;
};

type TeamRow = {
  id: string;
  country_name: string | null;
  country_code: string | null;
};

type MatchRow = {
  id: string;
  round_key: string;
  match_number: number;
  status: string;
};

type LivePrediction = PredictionRow & {
  playerName: string;
  winnerName: string;
  matchLabel: string;
};

async function loadPredictions() {
  if (!hasSupabaseServiceEnv()) return { rows: [] as LivePrediction[], error: "" };

  try {
    const supabase = createServiceClient();
    const { data: predictionRows, error } = await supabase
      .from("solo_match_predictions")
      .select(
        "id, user_id, match_id, selected_winner_team_id, predicted_team_a_score, predicted_team_b_score, individual_match_score, team_accumulated_score, final_earned_score, status, submitted_at",
      )
      .order("submitted_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const predictions = (predictionRows ?? []) as PredictionRow[];
    const userIds = [...new Set(predictions.map((row) => row.user_id))];
    const teamIds = [
      ...new Set(predictions.map((row) => row.selected_winner_team_id)),
    ];
    const matchIds = [...new Set(predictions.map((row) => row.match_id))];

    const [{ data: profiles }, { data: teams }, { data: matches }] =
      await Promise.all([
        userIds.length
          ? supabase
              .from("profiles")
              .select("auth_user_id, display_name, nickname, email")
              .in("auth_user_id", userIds)
          : { data: [] },
        teamIds.length
          ? supabase
              .from("teams")
              .select("id, country_name, country_code")
              .in("id", teamIds)
          : { data: [] },
        matchIds.length
          ? supabase
              .from("knockout_matches")
              .select("id, round_key, match_number, status")
              .in("id", matchIds)
          : { data: [] },
      ]);

    const profileByUser = new Map(
      ((profiles ?? []) as ProfileRow[]).map((profile) => [
        profile.auth_user_id,
        profile,
      ]),
    );
    const teamById = new Map(
      ((teams ?? []) as TeamRow[]).map((team) => [team.id, team]),
    );
    const matchById = new Map(
      ((matches ?? []) as MatchRow[]).map((match) => [match.id, match]),
    );

    return {
      rows: predictions.map((prediction) => {
        const profile = profileByUser.get(prediction.user_id);
        const team = teamById.get(prediction.selected_winner_team_id);
        const match = matchById.get(prediction.match_id);

        return {
          ...prediction,
          playerName:
            profile?.nickname ||
            profile?.display_name ||
            profile?.email ||
            "Player",
          winnerName: team?.country_name || team?.country_code || "Team",
          matchLabel: match
            ? `${match.round_key} Match ${match.match_number} · ${match.status}`
            : "Match",
        };
      }),
      error: "",
    };
  } catch (error) {
    return {
      rows: [] as LivePrediction[],
      error:
        error instanceof Error
          ? error.message
          : "Unable to load live predictions.",
    };
  }
}

export default async function AdminPredictionsPage() {
  const { rows, error } = await loadPredictions();

  return (
    <AdminLayout active="/admin/predictions">
      <SectionHeader
        eyebrow="Knockout Winner Challenge"
        title={knockoutWinnerAdminTitle}
        body="Live prediction records from players. Sync matches, then score from official results."
      />
      <Game2SimulationAdmin />
      <ApiMatchSyncAdmin />

      {error ? (
        <div className="mb-4 rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
          {error}
        </div>
      ) : null}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="p-4">Player</th>
              <th className="p-4">Match</th>
              <th className="p-4">Winner Pick</th>
              <th className="p-4">Score Pick</th>
              <th className="p-4">Individual</th>
              <th className="p-4">Team</th>
              <th className="p-4">Final</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-5 text-sm font-bold text-slate-500" colSpan={8}>
                  No live Game 2 prediction records yet.
                </td>
              </tr>
            ) : null}
            {rows.map((prediction) => (
              <tr key={prediction.id} className="border-t border-slate-100">
                <td className="p-4 font-black">{prediction.playerName}</td>
                <td className="p-4">{prediction.matchLabel}</td>
                <td className="p-4 font-bold">{prediction.winnerName}</td>
                <td className="p-4">
                  {prediction.predicted_team_a_score ?? "-"} -{" "}
                  {prediction.predicted_team_b_score ?? "-"}
                </td>
                <td className="p-4 font-black">
                  {prediction.individual_match_score ?? 0}
                </td>
                <td className="p-4 font-black">
                  {prediction.team_accumulated_score ?? 0}
                </td>
                <td className="p-4 font-black text-[#d71920]">
                  {prediction.final_earned_score ?? 0}
                </td>
                <td className="p-4 font-black text-[#0f8a4b]">
                  {prediction.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
