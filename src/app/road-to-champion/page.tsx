import { PageShell, SectionHeader } from "@/components/app-shell";
import {
  RoadToChampionGame,
  type RoadPrediction,
  type RoadStage,
  type RoadTeam,
} from "@/components/road-to-champion-game";
import { requireCompletedProfile } from "@/lib/auth-guards";
import { getCurrentRound } from "@/lib/demo-data";
import {
  loadFirstRoundOf32Deadline,
  loadFinalTeams,
  loadQuarterFinalTeams,
  loadRoundOf32Teams,
  loadRoundOf16Teams,
  loadWorldCupGroupTeams,
  type ApiGroupTeamDebug,
} from "@/lib/football-data";
import { sortRoadStages } from "@/lib/road-to-champion";
import { stageInlineName } from "@/lib/stage-labels";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

type RankingRow = {
  user_id: string;
  total_points: number;
  rank_position: number;
};

type PointRow = {
  source_type: string;
  points: number | null;
};

function normalizeTeamKey(value?: string | null) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "");
}

function mapGroupDataToTeams(
  teams: RoadTeam[],
  groupTeams: Awaited<ReturnType<typeof loadWorldCupGroupTeams>>["teams"],
) {
  const byCode = new Map(
    groupTeams
      .filter((team) => team.country_code)
      .map((team) => [normalizeTeamKey(team.country_code), team]),
  );
  const byName = new Map(
    groupTeams.map((team) => [normalizeTeamKey(team.country_name), team]),
  );

  return teams
    .map((team) => {
      const apiTeam =
        byCode.get(normalizeTeamKey(team.country_code)) ??
        byName.get(normalizeTeamKey(team.country_name));

      if (!apiTeam) return null;

      return {
        ...team,
        country_name: team.country_name ?? apiTeam.country_name,
        country_code: team.country_code ?? apiTeam.country_code,
        flag_url: team.flag_url ?? apiTeam.country_flag,
        group_name: apiTeam.group_name,
        group_key: apiTeam.group_key,
        api_source: apiTeam.api_source,
      };
    })
    .filter(Boolean) as RoadTeam[];
}

function apiGroupDataToRoadTeams(
  groupTeams: Awaited<ReturnType<typeof loadWorldCupGroupTeams>>["teams"],
) {
  return groupTeams
    .map((team) => ({
      id: `api-${normalizeTeamKey(team.api_team_id || team.country_code || team.country_name)}`,
      country_name: team.country_name,
      country_code: team.country_code,
      flag_url: team.country_flag,
      flag_asset_path: null,
      group_name: team.group_name,
      group_key: team.group_key,
      api_source: team.api_source,
    }))
    .sort((a, b) => {
      const groupSort = String(a.group_key ?? "").localeCompare(
        String(b.group_key ?? ""),
        undefined,
        { numeric: true },
      );
      if (groupSort !== 0) return groupSort;
      return String(a.country_name ?? "").localeCompare(String(b.country_name ?? ""));
    }) as RoadTeam[];
}

function fallbackTeamsToWorldCupGroups(teams: RoadTeam[]) {
  const groupNames = Array.from({ length: 12 }, (_, index) =>
    `Group ${String.fromCharCode(65 + index)}`,
  );

  return teams.slice(0, 48).map((team, index) => {
    const groupIndex = Math.floor(index / 4);
    const groupName = groupNames[groupIndex] ?? "Group Pending";
    return {
      ...team,
      group_name: team.group_name ?? groupName,
      group_key: team.group_key ?? String.fromCharCode(65 + groupIndex),
      api_source: team.api_source ?? "fallback-grouped-list",
    };
  });
}

function demoStages(): RoadStage[] {
  return sortRoadStages([
    {
      stage_key: "last_16",
      stage_name: stageInlineName("last_16"),
      required_selection_count: 16,
      points_per_correct: 1,
      perfect_bonus_points: 20,
      due_at: "2026-06-28T15:59:00.000Z",
      status: "open",
    },
    {
      stage_key: "last_8",
      stage_name: stageInlineName("last_8"),
      required_selection_count: 8,
      points_per_correct: 2,
      perfect_bonus_points: 20,
      due_at: "2026-07-02T15:59:00.000Z",
      status: "draft",
    },
    {
      stage_key: "last_4",
      stage_name: stageInlineName("last_4"),
      required_selection_count: 4,
      points_per_correct: 4,
      perfect_bonus_points: 20,
      due_at: "2026-07-06T15:59:00.000Z",
      status: "draft",
    },
    {
      stage_key: "finalists",
      stage_name: stageInlineName("final"),
      required_selection_count: 2,
      points_per_correct: 6,
      perfect_bonus_points: 20,
      due_at: "2026-07-10T15:59:00.000Z",
      status: "draft",
    },
    {
      stage_key: "champion",
      stage_name: "Champion",
      required_selection_count: 1,
      points_per_correct: 10,
      perfect_bonus_points: 0,
      due_at: "2026-07-13T15:59:00.000Z",
      status: "draft",
    },
  ] as RoadStage[]);
}

function demoRoadTeams(): RoadTeam[] {
  const countries = [
    ["arg", "Argentina", "ARG", "ar"],
    ["aus", "Australia", "AUS", "au"],
    ["aut", "Austria", "AUT", "at"],
    ["bel", "Belgium", "BEL", "be"],
    ["bra", "Brazil", "BRA", "br"],
    ["cpv", "Cabo Verde", "CPV", "cv"],
    ["can", "Canada", "CAN", "ca"],
    ["col", "Colombia", "COL", "co"],
    ["crc", "Costa Rica", "CRC", "cr"],
    ["cro", "Croatia", "CRO", "hr"],
    ["cze", "Czechia", "CZE", "cz"],
    ["den", "Denmark", "DEN", "dk"],
    ["ecu", "Ecuador", "ECU", "ec"],
    ["egy", "Egypt", "EGY", "eg"],
    ["eng", "England", "ENG", "gb-eng"],
    ["fra", "France", "FRA", "fr"],
    ["ger", "Germany", "GER", "de"],
    ["gha", "Ghana", "GHA", "gh"],
    ["hai", "Haiti", "HAI", "ht"],
    ["hon", "Honduras", "HON", "hn"],
    ["irn", "Iran", "IRN", "ir"],
    ["irq", "Iraq", "IRQ", "iq"],
    ["ita", "Italy", "ITA", "it"],
    ["jpn", "Japan", "JPN", "jp"],
    ["jor", "Jordan", "JOR", "jo"],
    ["kor", "Korea Republic", "KOR", "kr"],
    ["mex", "Mexico", "MEX", "mx"],
    ["mar", "Morocco", "MAR", "ma"],
    ["ned", "Netherlands", "NED", "nl"],
    ["nzl", "New Zealand", "NZL", "nz"],
    ["nga", "Nigeria", "NGA", "ng"],
    ["nor", "Norway", "NOR", "no"],
    ["pan", "Panama", "PAN", "pa"],
    ["par", "Paraguay", "PAR", "py"],
    ["pol", "Poland", "POL", "pl"],
    ["por", "Portugal", "POR", "pt"],
    ["ksa", "Saudi Arabia", "KSA", "sa"],
    ["sen", "Senegal", "SEN", "sn"],
    ["srb", "Serbia", "SRB", "rs"],
    ["rsa", "South Africa", "RSA", "za"],
    ["esp", "Spain", "ESP", "es"],
    ["sui", "Switzerland", "SUI", "ch"],
    ["tun", "Tunisia", "TUN", "tn"],
    ["uru", "Uruguay", "URU", "uy"],
    ["usa", "USA", "USA", "us"],
    ["uzb", "Uzbekistan", "UZB", "uz"],
    ["ven", "Venezuela", "VEN", "ve"],
    ["wal", "Wales", "WAL", "gb-wls"],
  ];

  return countries.map(([id, name, code, flagCode]) => ({
    id: `mock-${id}`,
    country_name: name,
    country_code: code,
    flag_url: `https://flagcdn.com/w160/${flagCode}.png`,
    flag_asset_path: null,
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
  let groupDebug: ApiGroupTeamDebug | null = null;
  let groupDataAvailable = false;
  let teamsByStage: Partial<Record<string, RoadTeam[]>> = {};

  if (hasSupabaseServerEnv() && profile) {
    const supabase = await createClient();
    const serviceSupabase = hasSupabaseServiceEnv() ? createServiceClient() : null;
    const dataClient = serviceSupabase ?? supabase;

    const game1Deadline = await loadFirstRoundOf32Deadline();
    if (game1Deadline && serviceSupabase) {
      await serviceSupabase
        .from("prediction_stages")
        .update({
          due_at: game1Deadline.dueAt,
          kickoff_at: game1Deadline.kickoffAt,
          deadline_confirmed: true,
          deadline_source: "football_data_api",
          status:
            new Date(game1Deadline.dueAt).getTime() <= Date.now()
              ? "locked"
              : "open",
          updated_at: new Date().toISOString(),
        })
        .eq("stage_key", "last_16")
        .neq("status", "scored");
    }

    const { data: stageRows } = await dataClient
      .from("prediction_stages")
      .select(
        "stage_key, stage_name, required_selection_count, points_per_correct, perfect_bonus_points, due_at, status, deadline_confirmed, deadline_source, kickoff_at",
      );

    if (stageRows?.length) {
      stages = sortRoadStages(stageRows as RoadStage[]);
    }

    if (!game1Deadline) {
      stages = stages.map((stage) =>
        stage.stage_key === "last_16"
          ? { ...stage, deadline_confirmed: Boolean(stage.deadline_confirmed) }
          : stage,
      );
    }

    const { data: teamRows } = await dataClient
      .from("teams")
      .select("id, country_name, country_code, flag_url, flag_asset_path")
      .order("country_name");

    if (teamRows?.length) {
      teams = teamRows as RoadTeam[];
    }

    const groupResult = await loadWorldCupGroupTeams();
    groupDebug = groupResult.debug;
    const apiSweet16Teams = apiGroupDataToRoadTeams(groupResult.teams);
    if (groupResult.debug.available && apiSweet16Teams.length >= 48) {
      const groupedTeams = mapGroupDataToTeams(teams, groupResult.teams);
      if (apiSweet16Teams.length) {
        teams = groupedTeams.length ? groupedTeams : apiSweet16Teams;
        groupDataAvailable = true;
        teamsByStage.last_16 = apiSweet16Teams;
      }
    } else {
      const fallbackSweet16Teams = fallbackTeamsToWorldCupGroups(teams);
      if (fallbackSweet16Teams.length) {
        teams = fallbackSweet16Teams;
        groupDataAvailable = true;
        teamsByStage.last_16 = fallbackSweet16Teams;
      }
    }

    const stagePoolLoaders = [
      ["last_8", loadRoundOf32Teams],
      ["last_4", loadRoundOf16Teams],
      ["finalists", loadQuarterFinalTeams],
      ["champion", loadFinalTeams],
    ] as const;

    for (const [stageKey, loader] of stagePoolLoaders) {
      const poolResult = await loader();
      if (poolResult.debug.available) {
        const poolTeams = mapGroupDataToTeams(teams, poolResult.teams);
        if (poolTeams.length) teamsByStage[stageKey] = poolTeams;
      }
    }

    const { data: predictionRows } = await dataClient
      .from("user_stage_predictions")
      .select(
        "stage_key, selected_team_ids, status, points_earned, correct_count, bonus_earned, personal_correct_score, team_accumulated_score, final_earned_score",
      )
      .eq("user_id", profile.auth_user_id);

    predictions = (predictionRows ?? []) as RoadPrediction[];

    const { data: pointRows } = await supabase
      .from("point_transactions")
      .select("source_type, points")
      .eq("user_id", profile.auth_user_id);

    totalPoints = ((pointRows ?? []) as PointRow[]).reduce(
      (sum, row) => sum + Number(row.points ?? 0),
      0,
    );
    referralPoints = ((pointRows ?? []) as PointRow[])
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
          groupDataAvailable={groupDataAvailable}
          teamsByStage={teamsByStage}
        />
      </main>
    </PageShell>
  );
}
