import { matches, teams } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

type ProviderMatch = {
  id: number | string;
  utcDate?: string;
  status?: string;
  minute?: number | null;
  stage?: string;
  group?: string | null;
  homeTeam?: {
    name?: string;
    shortName?: string;
    tla?: string;
    crest?: string;
  };
  awayTeam?: {
    name?: string;
    shortName?: string;
    tla?: string;
    crest?: string;
  };
  score?: {
    fullTime?: {
      home?: number | null;
      away?: number | null;
      homeTeam?: number | null;
      awayTeam?: number | null;
    };
    halfTime?: {
      home?: number | null;
      away?: number | null;
      homeTeam?: number | null;
      awayTeam?: number | null;
    };
  };
};

type ScoreboardMatch = {
  id: string;
  utcDate: string;
  status: string;
  minute: number | null;
  stage: string;
  group: string;
  homeTeam: {
    name: string;
    shortName: string;
    crest?: string;
  };
  awayTeam: {
    name: string;
    shortName: string;
    crest?: string;
  };
  score: {
    home: number | null;
    away: number | null;
    halfHome: number | null;
    halfAway: number | null;
  };
};

function scoreValue(
  score: ProviderMatch["score"],
  period: "fullTime" | "halfTime",
  side: "home" | "away",
) {
  const block = score?.[period];
  return block?.[side] ?? block?.[side === "home" ? "homeTeam" : "awayTeam"] ?? null;
}

function normalizeProviderMatch(match: ProviderMatch): ScoreboardMatch {
  return {
    id: String(match.id),
    utcDate: match.utcDate ?? "",
    status: match.status ?? "SCHEDULED",
    minute: match.minute ?? null,
    stage: match.stage ?? "World Cup",
    group: match.group ?? "",
    homeTeam: {
      name: match.homeTeam?.name ?? "TBC",
      shortName: match.homeTeam?.tla ?? match.homeTeam?.shortName ?? "TBC",
      crest: match.homeTeam?.crest,
    },
    awayTeam: {
      name: match.awayTeam?.name ?? "TBC",
      shortName: match.awayTeam?.tla ?? match.awayTeam?.shortName ?? "TBC",
      crest: match.awayTeam?.crest,
    },
    score: {
      home: scoreValue(match.score, "fullTime", "home"),
      away: scoreValue(match.score, "fullTime", "away"),
      halfHome: scoreValue(match.score, "halfTime", "home"),
      halfAway: scoreValue(match.score, "halfTime", "away"),
    },
  };
}

function localFallbackMatches(): ScoreboardMatch[] {
  return matches.slice(0, 6).map((match) => {
    const home = teams.find((team) => team.id === match.teamAId);
    const away = teams.find((team) => team.id === match.teamBId);

    return {
      id: match.id,
      utcDate: match.matchTime,
      status: match.status.toUpperCase(),
      minute: null,
      stage: "Round of 32",
      group: "",
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

function buildFootballDataUrl() {
  const competition = process.env.FOOTBALL_DATA_COMPETITION ?? "WC";
  const season = process.env.FOOTBALL_DATA_SEASON ?? "2026";
  const baseUrl = process.env.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org";
  const url = new URL(`/v4/competitions/${competition}/matches`, baseUrl);
  url.searchParams.set("season", season);
  return url;
}

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (!apiKey) {
    return Response.json({
      source: "fallback",
      provider: "Football-Data.org",
      updatedAt: new Date().toISOString(),
      message: "Add FOOTBALL_DATA_API_KEY in Vercel to switch this table to live scores.",
      matches: localFallbackMatches(),
    });
  }

  try {
    const response = await fetch(buildFootballDataUrl(), {
      headers: {
        "X-Auth-Token": apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Provider returned ${response.status}`);
    }

    const data = (await response.json()) as { matches?: ProviderMatch[] };
    const liveStatuses = new Set(["LIVE", "IN_PLAY", "PAUSED"]);
    const matchesForTable = (data.matches ?? [])
      .sort((a, b) => {
        const aLive = liveStatuses.has(a.status ?? "") ? 0 : 1;
        const bLive = liveStatuses.has(b.status ?? "") ? 0 : 1;
        if (aLive !== bLive) return aLive - bLive;
        return String(a.utcDate ?? "").localeCompare(String(b.utcDate ?? ""));
      })
      .slice(0, 10)
      .map(normalizeProviderMatch);

    return Response.json({
      source: "live",
      provider: "Football-Data.org",
      updatedAt: new Date().toISOString(),
      matches: matchesForTable,
    });
  } catch (error) {
    return Response.json({
      source: "fallback",
      provider: "Football-Data.org",
      updatedAt: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Unable to load live scores.",
      matches: localFallbackMatches(),
    });
  }
}
