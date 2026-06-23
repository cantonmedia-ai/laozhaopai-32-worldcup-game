export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

type ProviderTeam = {
  id?: number | string;
  name?: string;
  shortName?: string;
  tla?: string;
};

type ProviderScoreBlock = {
  home?: number | null;
  away?: number | null;
  homeTeam?: number | null;
  awayTeam?: number | null;
};

type ProviderMatch = {
  id: number | string;
  utcDate?: string;
  status?: string;
  stage?: string;
  homeTeam?: ProviderTeam;
  awayTeam?: ProviderTeam;
  score?: {
    winner?: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime?: ProviderScoreBlock;
  };
};

type DbMatch = {
  id: string;
  round_key: string;
  match_number: number;
  match_start_at: string;
  status: string;
  team_a: DbTeam;
  team_b: DbTeam;
};

type DbTeam = {
  id: string;
  country_name: string;
  country_code: string | null;
};

const finishedStatuses = new Set(["FINISHED", "AWARDED"]);
const roundAliases: Record<string, string[]> = {
  last_32: ["LAST_32", "ROUND_OF_32", "ROUND_32"],
  last_16: ["LAST_16", "ROUND_OF_16", "ROUND_16"],
  last_8: ["QUARTER_FINALS", "QUARTER_FINAL", "LAST_8", "ROUND_OF_8"],
  last_4: ["SEMI_FINALS", "SEMI_FINAL", "LAST_4", "ROUND_OF_4"],
  final: ["FINAL"],
};

function cronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function footballDataUrl(path: string) {
  const competition = process.env.FOOTBALL_DATA_COMPETITION ?? "WC";
  const season = process.env.FOOTBALL_DATA_SEASON ?? "2026";
  const baseUrl = process.env.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org";
  const url = new URL(`/v4/competitions/${competition}/${path}`, baseUrl);
  url.searchParams.set("season", season);
  return url;
}

async function fetchProviderMatches(apiKey: string) {
  const response = await fetch(footballDataUrl("matches"), {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Football provider returned ${response.status}.`);
  }

  const data = (await response.json()) as { matches?: ProviderMatch[] };
  return data.matches ?? [];
}

function normalize(value?: string | number | null) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "");
}

function normalizeStage(value?: string) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function roundKeyFromStage(stage?: string) {
  const normalized = normalizeStage(stage);
  for (const [roundKey, aliases] of Object.entries(roundAliases)) {
    if (aliases.some((alias) => normalized.includes(alias))) return roundKey;
  }
  return null;
}

function scoreValue(
  score: ProviderMatch["score"],
  side: "home" | "away",
) {
  const block = score?.fullTime;
  return block?.[side] ?? block?.[side === "home" ? "homeTeam" : "awayTeam"] ?? null;
}

function teamKeys(team?: ProviderTeam) {
  return [
    normalize(team?.tla),
    normalize(team?.shortName),
    normalize(team?.name),
  ].filter(Boolean);
}

function dbTeamKeys(team: DbTeam) {
  return [normalize(team.country_code), normalize(team.country_name)].filter(Boolean);
}

function sameTeam(providerTeam: ProviderTeam | undefined, dbTeam: DbTeam) {
  const providerKeys = teamKeys(providerTeam);
  const localKeys = dbTeamKeys(dbTeam);
  return providerKeys.some((providerKey) =>
    localKeys.some(
      (localKey) =>
        providerKey === localKey ||
        providerKey.includes(localKey) ||
        localKey.includes(providerKey),
    ),
  );
}

function sameMatchTeams(providerMatch: ProviderMatch, dbMatch: DbMatch) {
  const direct =
    sameTeam(providerMatch.homeTeam, dbMatch.team_a) &&
    sameTeam(providerMatch.awayTeam, dbMatch.team_b);
  const reversed =
    sameTeam(providerMatch.homeTeam, dbMatch.team_b) &&
    sameTeam(providerMatch.awayTeam, dbMatch.team_a);

  return { direct, reversed, matched: direct || reversed };
}

function withinKickoffWindow(providerMatch: ProviderMatch, dbMatch: DbMatch) {
  if (!providerMatch.utcDate || !dbMatch.match_start_at) return true;
  const providerMs = new Date(providerMatch.utcDate).getTime();
  const dbMs = new Date(dbMatch.match_start_at).getTime();
  if (!Number.isFinite(providerMs) || !Number.isFinite(dbMs)) return true;

  return Math.abs(providerMs - dbMs) <= 12 * 60 * 60 * 1000;
}

function resolveWinnerSide(match: ProviderMatch, homeScore: number, awayScore: number) {
  if (match.score?.winner === "HOME_TEAM") return "home";
  if (match.score?.winner === "AWAY_TEAM") return "away";
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return null;
}

function actualWinnerTeamId({
  providerMatch,
  dbMatch,
  reversed,
  winnerSide,
}: {
  providerMatch: ProviderMatch;
  dbMatch: DbMatch;
  reversed: boolean;
  winnerSide: "home" | "away";
}) {
  if (winnerSide === "home") return reversed ? dbMatch.team_b.id : dbMatch.team_a.id;
  return reversed ? dbMatch.team_a.id : dbMatch.team_b.id;
}

function actualScoresForDb({
  reversed,
  homeScore,
  awayScore,
}: {
  reversed: boolean;
  homeScore: number;
  awayScore: number;
}) {
  return reversed
    ? { teamAScore: awayScore, teamBScore: homeScore }
    : { teamAScore: homeScore, teamBScore: awayScore };
}

async function syncGame2Results() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      source: "not_configured",
      message: "FOOTBALL_DATA_API_KEY is not configured.",
      processed: 0,
      scored: 0,
      skipped: 0,
      details: [],
    };
  }

  if (!hasSupabaseServiceEnv()) {
    return {
      ok: false,
      source: "not_configured",
      message: "Supabase service key is not configured.",
      processed: 0,
      scored: 0,
      skipped: 0,
      details: [],
    };
  }

  const [providerMatches, supabase] = await Promise.all([
    fetchProviderMatches(apiKey),
    Promise.resolve(createServiceClient()),
  ]);

  const finishedKnockoutMatches = providerMatches
    .map((match) => ({ match, roundKey: roundKeyFromStage(match.stage) }))
    .filter(
      (row): row is { match: ProviderMatch; roundKey: string } =>
        Boolean(row.roundKey) && finishedStatuses.has(row.match.status ?? ""),
    );

  const { data: dbMatches, error } = await supabase
    .from("knockout_matches")
    .select(
      "id, round_key, match_number, match_start_at, status, team_a:team_a_id(id, country_name, country_code), team_b:team_b_id(id, country_name, country_code)",
    )
    .in("status", ["open", "locked"])
    .order("match_start_at", { ascending: true });

  if (error) throw new Error(error.message);

  const details: Array<Record<string, unknown>> = [];
  let scored = 0;
  let skipped = 0;

  for (const row of finishedKnockoutMatches) {
    const homeScore = scoreValue(row.match.score, "home");
    const awayScore = scoreValue(row.match.score, "away");
    const winnerSide =
      typeof homeScore === "number" && typeof awayScore === "number"
        ? resolveWinnerSide(row.match, homeScore, awayScore)
        : null;

    if (typeof homeScore !== "number" || typeof awayScore !== "number" || !winnerSide) {
      skipped += 1;
      details.push({
        providerMatchId: String(row.match.id),
        status: "skipped",
        reason: "Finished match has no usable full-time score or winner.",
      });
      continue;
    }

    const candidates = ((dbMatches ?? []) as unknown as DbMatch[]).filter(
      (dbMatch) =>
        dbMatch.round_key === row.roundKey &&
        withinKickoffWindow(row.match, dbMatch) &&
        sameMatchTeams(row.match, dbMatch).matched,
    );

    if (candidates.length !== 1) {
      skipped += 1;
      details.push({
        providerMatchId: String(row.match.id),
        roundKey: row.roundKey,
        status: "skipped",
        reason: candidates.length ? "Multiple local matches matched." : "No local match matched.",
        candidateCount: candidates.length,
      });
      continue;
    }

    const dbMatch = candidates[0];
    const teamMatch = sameMatchTeams(row.match, dbMatch);
    const reversed = teamMatch.reversed && !teamMatch.direct;
    const scores = actualScoresForDb({ reversed, homeScore, awayScore });
    const winnerTeamId = actualWinnerTeamId({
      providerMatch: row.match,
      dbMatch,
      reversed,
      winnerSide,
    });

    const rpc = await supabase.rpc("admin_confirm_knockout_match_result", {
      p_match_id: dbMatch.id,
      p_actual_winner_team_id: winnerTeamId,
      p_team_a_score: scores.teamAScore,
      p_team_b_score: scores.teamBScore,
    });

    if (rpc.error) {
      skipped += 1;
      details.push({
        providerMatchId: String(row.match.id),
        localMatchId: dbMatch.id,
        status: "skipped",
        reason: rpc.error.message,
      });
      continue;
    }

    scored += 1;
    details.push({
      providerMatchId: String(row.match.id),
      localMatchId: dbMatch.id,
      roundKey: dbMatch.round_key,
      matchNumber: dbMatch.match_number,
      status: "scored",
      score: `${scores.teamAScore}-${scores.teamBScore}`,
    });
  }

  if (scored > 0) {
    await supabase.rpc("rebuild_final_score_summaries");
  }

  return {
    ok: true,
    source: "live",
    provider: "Football-Data.org",
    updatedAt: new Date().toISOString(),
    processed: finishedKnockoutMatches.length,
    scored,
    skipped,
    details,
  };
}

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await syncGame2Results();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Unable to sync Game 2 results.",
      },
      { status: 500 },
    );
  }
}
