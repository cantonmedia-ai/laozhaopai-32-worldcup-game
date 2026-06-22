import { PageShell, SectionHeader } from "@/components/app-shell";
import { Last32PlayerPicker, type Last32Team } from "@/components/last32-player-picker";
import { PredictionBoard } from "@/components/prediction-board";
import { getCurrentMatches, getCurrentRound } from "@/lib/demo-data";
import { requireCompletedProfile } from "@/lib/auth-guards";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

export default async function PredictPage() {
  const profile = await requireCompletedProfile("/predict");
  const round = getCurrentRound();
  const matches = getCurrentMatches();
  let last32Teams: Last32Team[] = [];
  let pickedTeamIds: string[] = [];

  if (hasSupabaseServerEnv() && profile) {
    const supabase = await createClient();
    const { data: teamRows } = await supabase
      .from("tournament_teams")
      .select(
        "tournament_id, seed_position, teams!inner(id, country_name, country_code, flag_url, flag_asset_path), tournaments!inner(name)",
      )
      .eq("stage", "last_32")
      .eq("tournaments.name", "FIFA World Cup 2026")
      .order("seed_position", { ascending: true });

    last32Teams = (teamRows ?? []).map((row) => {
      const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
      return {
        id: team.id,
        tournament_id: row.tournament_id,
        country_name: team.country_name,
        country_code: team.country_code,
        flag_url: team.flag_url,
        flag_asset_path: team.flag_asset_path,
        seed_position: row.seed_position,
      };
    }) as Last32Team[];

    const tournamentId = last32Teams[0]?.tournament_id;
    if (tournamentId) {
      const { data: picks } = await supabase
        .from("player_last32_picks")
        .select("team_id")
        .eq("profile_id", profile.id)
        .eq("tournament_id", tournamentId);

      pickedTeamIds = (picks ?? []).map((pick) => pick.team_id as string);
    }
  }

  return (
    <PageShell active="/predict">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeader
          eyebrow={`${round.labelCn} · ${round.scoringPoints} points`}
          title="Last 32 Seats"
          body="Choose your Last 32 teams from the admin-selected team database. Country names and flags come from Supabase."
        />

        {last32Teams.length ? (
          <Last32PlayerPicker
            teams={last32Teams}
            initialPickedTeamIds={pickedTeamIds}
          />
        ) : (
          <>
            <div className="mb-5 rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
              Admin has not created the database-backed Last 32 yet. Showing the old prediction board fallback.
            </div>
            <PredictionBoard matches={matches} />
          </>
        )}
      </main>
    </PageShell>
  );
}
