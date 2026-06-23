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
  status?: string;
  stage?: string;
  homeTeam?: ProviderTeam;
  awayTeam?: ProviderTeam;
  score?: {
    winner?: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime?: ProviderScoreBlock;
  };
};

type DbTeam = {
  id: string;
  country_name: string;
  country_code: string | null;
};

type StageRow = {
  stage_key: string;
  required_selection_count: number;
  status: string;
};

const finishedStatuses = new Set(["FINISHED", "AWARDED"]);

const game1StageRules: Array<{
  stageKey: "last_16" | "last_8" | "last_4" | "finalists" | "champion";
  aliases: string[];
  requiredCount: number;
}> = [
  {
    stageKey: "last_16",
    aliases: ["LAST_32", "ROUND_OF_32", "ROUND_32"],
    requiredCount: 16,
  },
  {
    stageKey: "last_8",
    aliases: ["LAST_16", "ROUND_OF_16", "ROUND_16"],
    requiredCount: 8,
  },
  {
    stageKey: "last_4",
    aliases: ["QUARTER_FINALS", "QUARTER_FINAL", "LAST_8", "ROUND_OF_8"],
    requiredCount: 4,
  },
  {
    stageKey: "finalists",
    aliases: ["SEMI_FINALS", "SEMI_FINAL", "LAST_4", "ROUND_OF_4"],
    requiredCount: 2,
  },
  {
    stageKey: "champion",
    aliases: ["FINAL"],
    requiredCount: 1,
  },
];

function cronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    const userAgent = request.headers.get("user-agent") ?? "";
    const cronHeader = request.headers.get("x-vercel-cron") ?? "";
    return userAgent.toLowerCase().includes("vercel-cron") || cronHeader === "1";
  }
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

function stageMatches(match: ProviderMatch, aliases: string[]) {
  const stage = normalizeStage(match.stage);
  return aliases.some((alias) => stage.includes(alias));
}

function scoreValue(score: ProviderMatch["score"], side: "home" | "away") {
  const block = score?.fullTime;
  return block?.[side] ?? block?.[side === "home" ? "homeTeam" : "awayTeam"] ?? null;
}

function winnerTeam(match: ProviderMatch) {
  const homeScore = scoreValue(match.score, "home");
  const awayScore = scoreValue(match.score, "away");

  if (match.score?.winner === "HOME_TEAM") return match.homeTeam ?? null;
  if (match.score?.winner === "AWAY_TEAM") return match.awayTeam ?? null;
  if (typeof homeScore === "number" && typeof awayScore === "number") {
    if (homeScore > awayScore) return match.homeTeam ?? null;
    if (awayScore > homeScore) return match.awayTeam ?? null;
  }

  return null;
}

function providerTeamKeys(team?: ProviderTeam | null) {
  return [
    normalize(team?.tla),
    normalize(team?.shortName),
    normalize(team?.name),
  ].filter(Boolean);
}

function dbTeamKeys(team: DbTeam) {
  return [normalize(team.country_code), normalize(team.country_name)].filter(Boolean);
}

function findLocalTeamId(providerTeam: ProviderTeam | null, teams: DbTeam[]) {
  const providerKeys = providerTeamKeys(providerTeam);
  if (!providerKeys.length) return null;

  const direct = teams.find((team) =>
    dbTeamKeys(team).some((localKey) =>
      providerKeys.some((providerKey) => providerKey === localKey),
    ),
  );
  if (direct) return direct.id;

  const loose = teams.find((team) =>
    dbTeamKeys(team).some((localKey) =>
      providerKeys.some(
        (providerKey) =>
          providerKey.includes(localKey) || localKey.includes(providerKey),
      ),
    ),
  );

  return loose?.id ?? null;
}

async function syncGame1Results() {
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

  const [{ data: teamRows, error: teamError }, { data: stageRows, error: stageError }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, country_name, country_code")
        .eq("is_active", true),
      supabase
        .from("prediction_stages")
        .select("stage_key, required_selection_count, status"),
    ]);

  if (teamError) throw new Error(teamError.message);
  if (stageError) throw new Error(stageError.message);

  const teams = (teamRows ?? []) as DbTeam[];
  const stages = new Map(
    ((stageRows ?? []) as StageRow[]).map((stage) => [stage.stage_key, stage]),
  );
  const details: Array<Record<string, unknown>> = [];
  let scored = 0;
  let skipped = 0;

  for (const rule of game1StageRules) {
    const stage = stages.get(rule.stageKey);
    if (!stage) {
      skipped += 1;
      details.push({
        stageKey: rule.stageKey,
        status: "skipped",
        reason: "Prediction stage is not created.",
      });
      continue;
    }

    if (stage.status === "scored") {
      skipped += 1;
      details.push({
        stageKey: rule.stageKey,
        status: "skipped",
        reason: "Stage already scored.",
      });
      continue;
    }

    const finishedMatches = providerMatches.filter(
      (match) =>
        finishedStatuses.has(match.status ?? "") && stageMatches(match, rule.aliases),
    );
    const winnerIds = [
      ...new Set(
        finishedMatches
          .map((match) => findLocalTeamId(winnerTeam(match), teams))
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const requiredCount = Number(stage.required_selection_count ?? rule.requiredCount);

    if (winnerIds.length !== requiredCount) {
      skipped += 1;
      details.push({
        stageKey: rule.stageKey,
        status: "pending",
        expectedWinners: requiredCount,
        detectedWinners: winnerIds.length,
        finishedMatches: finishedMatches.length,
      });
      continue;
    }

    const saveResult = await supabase.rpc("admin_save_stage_result", {
      p_stage_key: rule.stageKey,
      p_team_ids: winnerIds,
    });

    if (saveResult.error) {
      skipped += 1;
      details.push({
        stageKey: rule.stageKey,
        status: "skipped",
        reason: saveResult.error.message,
      });
      continue;
    }

    const calculate = await supabase.rpc("admin_calculate_road_stage_score", {
      p_stage_key: rule.stageKey,
    });

    if (calculate.error) {
      skipped += 1;
      details.push({
        stageKey: rule.stageKey,
        status: "skipped",
        reason: calculate.error.message,
      });
      continue;
    }

    scored += 1;
    details.push({
      stageKey: rule.stageKey,
      status: "scored",
      officialTeamCount: winnerIds.length,
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
    processed: game1StageRules.length,
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
    const result = await syncGame1Results();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Unable to sync Game 1 results.",
      },
      { status: 500 },
    );
  }
}
