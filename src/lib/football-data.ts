type ProviderMatch = {
  utcDate?: string;
  stage?: string;
  status?: string;
  group?: string | null;
  homeTeam?: ProviderTeam;
  awayTeam?: ProviderTeam;
};

type ProviderTeam = {
  id?: number | string;
  name?: string;
  shortName?: string;
  tla?: string;
  crest?: string;
};

type ProviderStanding = {
  stage?: string;
  group?: string | null;
  table?: Array<{
    team?: ProviderTeam;
  }>;
};

export type FixtureDeadline = {
  kickoffAt: string;
  dueAt: string;
};

function footballDataUrl(path: string) {
  const competition = process.env.FOOTBALL_DATA_COMPETITION ?? "WC";
  const season = process.env.FOOTBALL_DATA_SEASON ?? "2026";
  const baseUrl = process.env.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org";
  const url = new URL(`/v4/competitions/${competition}/${path}`, baseUrl);
  url.searchParams.set("season", season);
  return url;
}

async function fetchFootballData<T>(path: string, revalidate = 900) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(footballDataUrl(path), {
    headers: { "X-Auth-Token": apiKey },
    next: { revalidate },
  });

  if (!response.ok) return null;
  return (await response.json()) as T;
}

function normalizeStage(value?: string) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function stageMatches(match: ProviderMatch, aliases: string[]) {
  const stage = normalizeStage(match.stage);
  return aliases.some((alias) => stage.includes(alias));
}

export async function loadFirstFixtureDeadline(
  aliases: string[],
  revalidate = 900,
): Promise<FixtureDeadline | null> {
  try {
    const data = await fetchFootballData<{ matches?: ProviderMatch[] }>(
      "matches",
      revalidate,
    );
    if (!data) return null;
    const kickoffAt = (data.matches ?? [])
      .filter((match) => stageMatches(match, aliases))
      .map((match) => match.utcDate)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

    if (!kickoffAt) return null;

    return {
      kickoffAt,
      dueAt: new Date(new Date(kickoffAt).getTime() - 15 * 60 * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}

export function loadFirstLast16Deadline() {
  return loadFirstFixtureDeadline(["LAST_16", "ROUND_OF_16", "ROUND_16"]);
}

export function loadFirstRoundOf32Deadline() {
  return loadFirstFixtureDeadline(["LAST_32", "ROUND_OF_32", "ROUND_32"]);
}

export function loadFirstRoundOf16Deadline() {
  return loadFirstFixtureDeadline(["LAST_16", "ROUND_OF_16", "ROUND_16"]);
}

export function loadFirstQuarterFinalDeadline() {
  return loadFirstFixtureDeadline([
    "QUARTER_FINALS",
    "QUARTER_FINAL",
    "LAST_8",
    "ROUND_OF_8",
  ]);
}

export function loadFirstSemiFinalDeadline() {
  return loadFirstFixtureDeadline([
    "SEMI_FINALS",
    "SEMI_FINAL",
    "LAST_4",
    "ROUND_OF_4",
  ]);
}

export function loadFirstFinalDeadline() {
  return loadFirstFixtureDeadline(["FINAL"]);
}

function cleanGroupName(value?: string | null) {
  const group = String(value ?? "").trim().replace(/^GROUP[_\s-]*/i, "Group ");
  return group || null;
}

function groupSortKey(value?: string | null) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/^GROUP[_\s-]*/i, "")
    .replace(/[^A-Z0-9]/g, "");
}

function teamKey(team?: ProviderTeam) {
  return String(team?.id ?? team?.tla ?? team?.shortName ?? team?.name ?? "");
}

function normalizeProviderTeam(team?: ProviderTeam, group?: string | null): ApiGroupTeam | null {
  const groupName = cleanGroupName(group);
  if (!team?.name || !groupName) return null;

  return {
    api_team_id: String(team.id ?? team.tla ?? team.name),
    country_name: team.name,
    country_code: team.tla ?? team.shortName ?? null,
    country_flag: team.crest ?? null,
    group_name: groupName,
    group_key: groupSortKey(groupName),
    api_source: "football-data.org",
  };
}

export type ApiGroupTeam = {
  api_team_id: string;
  country_name: string;
  country_code: string | null;
  country_flag: string | null;
  group_name: string;
  group_key: string;
  api_source: string;
};

export type ApiGroupTeamDebug = {
  available: boolean;
  totalCountries: number;
  totalGroups: number;
  missingGroupCount: number;
  missingFlagCount: number;
  countriesPerGroup: Array<{ groupName: string; count: number }>;
  lastApiSyncAt: string | null;
};

export type ApiGroupTeamResult = {
  teams: ApiGroupTeam[];
  debug: ApiGroupTeamDebug;
};

function debugForGroupTeams(teams: ApiGroupTeam[], available: boolean): ApiGroupTeamDebug {
  const counts = new Map<string, number>();
  for (const team of teams) {
    counts.set(team.group_name, (counts.get(team.group_name) ?? 0) + 1);
  }

  return {
    available,
    totalCountries: teams.length,
    totalGroups: counts.size,
    missingGroupCount: teams.filter((team) => !team.group_name).length,
    missingFlagCount: teams.filter((team) => !team.country_flag).length,
    countriesPerGroup: [...counts.entries()]
      .sort(([a], [b]) => groupSortKey(a).localeCompare(groupSortKey(b), undefined, { numeric: true }))
      .map(([groupName, count]) => ({ groupName, count })),
    lastApiSyncAt: available ? new Date().toISOString() : null,
  };
}

export async function loadWorldCupGroupTeams(
  revalidate = 900,
): Promise<ApiGroupTeamResult> {
  try {
    const standingsData = await fetchFootballData<{ standings?: ProviderStanding[] }>(
      "standings",
      revalidate,
    );
    const standingTeams = new Map<string, ApiGroupTeam>();

    for (const standing of standingsData?.standings ?? []) {
      const groupName = cleanGroupName(standing.group ?? standing.stage);
      for (const row of standing.table ?? []) {
        const team = normalizeProviderTeam(row.team, groupName);
        if (team) standingTeams.set(teamKey(row.team), team);
      }
    }

    if (standingTeams.size > 0) {
      const teams = [...standingTeams.values()];
      return { teams, debug: debugForGroupTeams(teams, true) };
    }

    const matchData = await fetchFootballData<{ matches?: ProviderMatch[] }>(
      "matches",
      revalidate,
    );
    const matchTeams = new Map<string, ApiGroupTeam>();

    for (const match of matchData?.matches ?? []) {
      const groupName = cleanGroupName(match.group);
      if (!groupName) continue;

      const home = normalizeProviderTeam(match.homeTeam, groupName);
      const away = normalizeProviderTeam(match.awayTeam, groupName);
      if (home) matchTeams.set(teamKey(match.homeTeam), home);
      if (away) matchTeams.set(teamKey(match.awayTeam), away);
    }

    const teams = [...matchTeams.values()];
    return { teams, debug: debugForGroupTeams(teams, teams.length > 0) };
  } catch {
    return { teams: [], debug: debugForGroupTeams([], false) };
  }
}

export async function loadRoundOf32Teams(
  revalidate = 900,
): Promise<ApiGroupTeamResult> {
  return loadKnockoutFixtureTeams(["LAST_32", "ROUND_OF_32", "ROUND_32"], revalidate);
}

export async function loadRoundOf16Teams(
  revalidate = 900,
): Promise<ApiGroupTeamResult> {
  return loadKnockoutFixtureTeams(["LAST_16", "ROUND_OF_16", "ROUND_16"], revalidate);
}

export async function loadQuarterFinalTeams(
  revalidate = 900,
): Promise<ApiGroupTeamResult> {
  return loadKnockoutFixtureTeams(
    ["QUARTER_FINALS", "QUARTER_FINAL", "LAST_8", "ROUND_OF_8"],
    revalidate,
  );
}

export async function loadSemiFinalTeams(
  revalidate = 900,
): Promise<ApiGroupTeamResult> {
  return loadKnockoutFixtureTeams(
    ["SEMI_FINALS", "SEMI_FINAL", "LAST_4", "ROUND_OF_4"],
    revalidate,
  );
}

export async function loadFinalTeams(
  revalidate = 900,
): Promise<ApiGroupTeamResult> {
  return loadKnockoutFixtureTeams(["FINAL"], revalidate);
}

async function loadKnockoutFixtureTeams(
  aliases: string[],
  revalidate = 900,
): Promise<ApiGroupTeamResult> {
  try {
    const [groupResult, matchData] = await Promise.all([
      loadWorldCupGroupTeams(revalidate),
      fetchFootballData<{ matches?: ProviderMatch[] }>("matches", revalidate),
    ]);
    const groupByCode = new Map(
      groupResult.teams
        .filter((team) => team.country_code)
        .map((team) => [groupSortKey(team.country_code), team]),
    );
    const groupByName = new Map(
      groupResult.teams.map((team) => [groupSortKey(team.country_name), team]),
    );
    const roundTeams = new Map<string, ApiGroupTeam>();

    for (const match of matchData?.matches ?? []) {
      if (!stageMatches(match, aliases)) continue;

      for (const providerTeam of [match.homeTeam, match.awayTeam]) {
        const key = teamKey(providerTeam);
        if (!key || roundTeams.has(key)) continue;

        const grouped =
          groupByCode.get(groupSortKey(providerTeam?.tla ?? providerTeam?.shortName)) ??
          groupByName.get(groupSortKey(providerTeam?.name));

        if (grouped) {
          roundTeams.set(key, {
            ...grouped,
            api_team_id: String(providerTeam?.id ?? grouped.api_team_id),
            country_name: providerTeam?.name ?? grouped.country_name,
            country_code: providerTeam?.tla ?? providerTeam?.shortName ?? grouped.country_code,
            country_flag: providerTeam?.crest ?? grouped.country_flag,
          });
        }
      }
    }

    const teams = [...roundTeams.values()];
    return { teams, debug: debugForGroupTeams(teams, teams.length > 0) };
  } catch {
    return { teams: [], debug: debugForGroupTeams([], false) };
  }
}
