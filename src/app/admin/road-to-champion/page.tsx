import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { RoadToChampionAdmin } from "@/components/road-to-champion-admin";
import type { RoadStage, RoadTeam } from "@/components/road-to-champion-game";
import { teams as demoTeams } from "@/lib/demo-data";
import { sortRoadStages, type RoadStageKey } from "@/lib/road-to-champion";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

type StageResult = {
  stage_key: RoadStageKey;
  official_team_ids: string[];
};

function fallbackTeams(): RoadTeam[] {
  return demoTeams.slice(0, 32).map((team) => ({
    id: team.id,
    country_name: team.name,
    country_code: team.shortName,
    flag_url: team.flagImage,
    flag_asset_path: team.flagImage,
  }));
}

export default async function AdminRoadToChampionPage() {
  let stages: RoadStage[] = [];
  let teams = fallbackTeams();
  let results: StageResult[] = [];

  if (hasSupabaseServerEnv()) {
    const supabase = await createClient();

    const { data: stageRows } = await supabase
      .from("prediction_stages")
      .select(
        "stage_key, stage_name, required_selection_count, points_per_correct, perfect_bonus_points, due_at, status",
      );

    stages = sortRoadStages((stageRows ?? []) as RoadStage[]);

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

    const { data: resultRows } = await supabase
      .from("stage_results")
      .select("stage_key, official_team_ids");

    results = (resultRows ?? []).map((row) => ({
      stage_key: row.stage_key as RoadStageKey,
      official_team_ids: (row.official_team_ids ?? []) as string[],
    }));
  }

  return (
    <AdminLayout active="/admin/road-to-champion">
      <SectionHeader
        eyebrow="Road Game"
        title="Road to Champion Control"
        body="Manage due dates, lock stages, enter official results, and calculate player scores."
      />
      {stages.length ? (
        <RoadToChampionAdmin stages={stages} teams={teams} results={results} />
      ) : (
        <div className="rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
          Road to Champion stages are not created yet. Run the latest database migration first.
        </div>
      )}
    </AdminLayout>
  );
}
