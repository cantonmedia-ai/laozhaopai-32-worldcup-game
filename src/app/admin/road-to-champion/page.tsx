import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { Game1SimulationAdmin } from "@/components/game1-simulation-admin";
import { RoadToChampionAdmin } from "@/components/road-to-champion-admin";
import type { RoadStage, RoadTeam } from "@/components/road-to-champion-game";
import { teams as demoTeams } from "@/lib/demo-data";
import { loadWorldCupGroupTeams, type ApiGroupTeamDebug } from "@/lib/football-data";
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
  let groupDebug: ApiGroupTeamDebug | null = null;

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

    groupDebug = (await loadWorldCupGroupTeams()).debug;
  }

  return (
    <AdminLayout active="/admin/road-to-champion">
      <SectionHeader
        eyebrow="Road Game"
        title="Road to Champion Control"
        body="Manage due dates, lock stages, enter official results, and calculate player scores."
      />
      {stages.length ? (
        <div className="grid gap-6">
          <Game1SimulationAdmin />
          {groupDebug ? (
            <section className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f8a4b]">
                    Game 1 API Group Data
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    Last 16 selection grouping debug
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Last API sync: {groupDebug.lastApiSyncAt ?? "Not available"}
                  </p>
                </div>
                {!groupDebug.available || groupDebug.missingGroupCount > 0 ? (
                  <div className="rounded bg-yellow-50 px-4 py-3 text-sm font-black text-yellow-900">
                    Some teams are missing group data.
                  </div>
                ) : (
                  <div className="rounded bg-green-50 px-4 py-3 text-sm font-black text-green-800">
                    Group data ready
                  </div>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded bg-slate-100 p-4">
                  <p className="text-sm font-bold text-slate-500">Countries loaded</p>
                  <p className="mt-1 text-2xl font-black">{groupDebug.totalCountries}</p>
                </div>
                <div className="rounded bg-slate-100 p-4">
                  <p className="text-sm font-bold text-slate-500">Groups loaded</p>
                  <p className="mt-1 text-2xl font-black">{groupDebug.totalGroups}</p>
                </div>
                <div className="rounded bg-slate-100 p-4">
                  <p className="text-sm font-bold text-slate-500">Missing group</p>
                  <p className="mt-1 text-2xl font-black">{groupDebug.missingGroupCount}</p>
                </div>
                <div className="rounded bg-slate-100 p-4">
                  <p className="text-sm font-bold text-slate-500">Missing flag</p>
                  <p className="mt-1 text-2xl font-black">{groupDebug.missingFlagCount}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {groupDebug.countriesPerGroup.map((group) => (
                  <div
                    key={group.groupName}
                    className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm font-bold"
                  >
                    <span>{group.groupName}</span>
                    <span className="rounded bg-[#071525] px-2 py-1 text-xs text-white">
                      {group.count}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <RoadToChampionAdmin stages={stages} teams={teams} results={results} />
        </div>
      ) : (
        <div className="rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
          Road to Champion stages are not created yet. Run the latest database migration first.
        </div>
      )}
    </AdminLayout>
  );
}
