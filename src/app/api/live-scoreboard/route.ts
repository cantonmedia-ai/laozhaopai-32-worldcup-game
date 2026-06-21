import { matches, teams } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

type ProviderMatch = {
  id: number | string;
  utcDate?: string;
  status?: string;
  minute?: number | null;
  stage?: string;
  group?: string | null;
  homeTeam?: ProviderTeam;
  awayTeam?: ProviderTeam;
  score?: {
    fullTime?: ProviderScore;
    halfTime?: ProviderScore;
  };
};

type ProviderScore = {
  home?: number | null;
  away?: number | null;
  homeTeam?: number | null;
  awayTeam?: number | null;
};

type ProviderTeam = {
  name?: string;
  shortName?: string;
  tla?: string;
  crest?: string;
};

type ProviderStanding = {
  stage?: string;
  type?: string;
  group?: string | null;
  table?: ProviderStandingRow[];
};

type ProviderStandingRow = {
  position?: number;
  team?: ProviderTeam;
  playedGames?: number;
  won?: number;
  draw?: number;
  lost?: number;
  points?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
};

type ScoreboardMatch = {
  id: string;
  utcDate: string;
  status: string;
  minute: number | null;
  stage: string;
  group: string;
  homeTeam: ScoreboardTeam;
  awayTeam: ScoreboardTeam;
  score: {
    home: number | null;
    away: number | null;
    halfHome: number | null;
    halfAway: number | null;
  };
};

type ScoreboardTeam = {
  name: string;
  shortName: string;
  crest?: string;
};

type ScoreboardStanding = {
  group: string;
  stage: string;
  rows: ScoreboardStandingRow[];
};

type ScoreboardStandingRow = {
  position: number;
  team: ScoreboardTeam;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalDifference: number;
  points: number;
};

const liveStatuses = new Set(["LIVE", "IN_PLAY", "PAUSED"]);
const finishedStatuses = new Set(["FINISHED", "AWARDED"]);
const upcomingStatuses = new Set(["SCHEDULED", "TIMED", "POSTPONED", "PREDICTION_OPEN"]);

function scoreValue(
  score: ProviderMatch["score"],
  period: "fullTime" | "halfTime",
  side: "home" | "away",
) {
  const block = score?.[period];
  return block?.[side] ?? block?.[side === "home" ? "homeTeam" : "awayTeam"] ?? null;
}

function normalizeTeam(team?: ProviderTeam): ScoreboardTeam {
  return {
    name: team?.name ?? "TBC",
    shortName: team?.tla ?? team?.shortName ?? "TBC",
    crest: team?.crest,
  };
}

function normalizeProviderMatch(match: ProviderMatch): ScoreboardMatch {
  return {
    id: String(match.id),
    utcDate: match.utcDate ?? "",
    status: match.status ?? "SCHEDULED",
    minute: match.minute ?? null,
    stage: match.stage ?? "World Cup",
    group: match.group ?? "",
    homeTeam: normalizeTeam(match.homeTeam),
    awayTeam: normalizeTeam(match.awayTeam),
    score: {
      home: scoreValue(match.score, "fullTime", "home"),
      away: scoreValue(match.score, "fullTime", "away"),
      halfHome: scoreValue(match.score, "halfTime", "home"),
      halfAway: scoreValue(match.score, "halfTime", "away"),
    },
  };
}

function compareByDate(a: ScoreboardMatch, b: ScoreboardMatch) {
  return String(a.utcDate).localeCompare(String(b.utcDate));
}

function compareByDateDesc(a: ScoreboardMatch, b: ScoreboardMatch) {
  return String(b.utcDate).localeCompare(String(a.utcDate));
}

function localFallbackMatches(): ScoreboardMatch[] {
  return matches.slice(0, 8).map((match) => {
    const home = teams.find((team) => team.id === match.teamAId);
    const away = teams.find((team) => team.id === match.teamBId);

    return {
      id: match.id,
      utcDate: match.matchTime,
      status: match.status.toUpperCase(),
      minute: null,
      stage: "Round of 32",
      group: home?.groupName ? `Group ${home.groupName}` : "",
      homeTeam: {
        name: home?.name ?? "TBC",
        shortName: home?.shortName ?? "TBC",
      },
      awayTeam: {
        name: away?.name ?? "TBC",
        shortName: away?.shortName ?? "TBC",
      },
      score: {
        home: match.teamAScore ?? null,
        away: match.teamBScore ?? null,
        halfHome: null,
        halfAway: null,
      },
    };
  });
}

function localFallbackStandings(): ScoreboardStanding[] {
  const groups = new Map<string, ScoreboardStandingRow[]>();

  teams.forEach((team) => {
    const group = `Group ${team.groupName}`;
    const rows = groups.get(group) ?? [];
    rows.push({
      position: rows.length + 1,
      team: {
        name: team.name,
        shortName: team.shortName,
      },
      played: 0,
      won: 0,
      draw: 0,
      lost: 0,
      goalDifference: 0,
      points: 0,
    });
    groups.set(group, rows);
  });

  return [...groups.entries()].map(([group, rows]) => ({
    group,
    stage: "Group Stage",
    rows,
  }));
}

function partitionMatches(allMatches: ScoreboardMatch[]) {
  const liveMatches = allMatches
    .filter((match) => liveStatuses.has(match.status))
    .sort(compareByDate);
  const nextMatches = allMatches
    .filter((match) => upcomingStatuses.has(match.status))
    .sort(compareByDate)
    .slice(0, 8);
  const pastResults = allMatches
    .filter((match) => finishedStatuses.has(match.status))
    .sort(compareByDateDesc)
    .slice(0, 8);

  return {
    matches: [...liveMatches, ...nextMatches, ...pastResults].slice(0, 10),
    liveMatches,
    nextMatches,
    pastResults,
  };
}

function normalizeStandings(standings: ProviderStanding[] = []) {
  return standings
    .filter((standing) => standing.table?.length)
    .map((standing) => ({
      group: standing.group ?? standing.stage ?? "Table",
      stage: standing.stage ?? "Group Stage",
      rows: (standing.table ?? []).map((row, index) => ({
        position: row.position ?? index + 1,
        team: normalizeTeam(row.team),
        played: row.playedGames ?? 0,
        won: row.won ?? 0,
        draw: row.draw ?? 0,
        lost: row.lost ?? 0,
        goalDifference: row.goalDifference ?? 0,
        points: row.points ?? 0,
      })),
    }));
}

function footballDataUrl(path: string) {
  const competition = process.env.FOOTBALL_DATA_COMPETITION ?? "WC";
  const season = process.env.FOOTBALL_DATA_SEASON ?? "2026";
  const baseUrl = process.env.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org";
  const url = new URL(`/v4/competitions/${competition}/${path}`, baseUrl);
  url.searchParams.set("season", season);
  return url;
}

async function fetchProviderJson<T>(path: string, apiKey: string) {
  const response = await fetch(footballDataUrl(path), {
    headers: {
      "X-Auth-Token": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Provider returned ${response.status} for ${path}`);
  }

  return (await response.json()) as T;
}

function fallbackPayload(message: string) {
  const allMatches = localFallbackMatches();

  return {
    source: "fallback",
    provider: "Football-Data.org",
    updatedAt: new Date().toISOString(),
    message,
    ...partitionMatches(allMatches),
    standings: localFallbackStandings(),
  };
}

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (!apiKey) {
    return Response.json(
      fallbackPayload(
        "Add FOOTBALL_DATA_API_KEY in Vercel to switch next games, results, and standings to live data.",
      ),
    );
  }

  try {
    const [matchData, standingData] = await Promise.all([
      fetchProviderJson<{ matches?: ProviderMatch[] }>("matches", apiKey),
      fetchProviderJson<{ standings?: ProviderStanding[] }>("standings", apiKey),
    ]);

    const allMatches = (matchData.matches ?? []).map(normalizeProviderMatch);

    return Response.json({
      source: "live",
      provider: "Football-Data.org",
      updatedAt: new Date().toISOString(),
      ...partitionMatches(allMatches),
      standings: normalizeStandings(standingData.standings),
    });
  } catch (error) {
    return Response.json(
      fallbackPayload(
        error instanceof Error ? error.message : "Unable to load live scoreboard data.",
      ),
    );
  }
}
