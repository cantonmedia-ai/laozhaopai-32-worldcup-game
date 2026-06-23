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
  due_at: string;
  points_per_correct: number;
};

type StagePrediction = {
  id: string;
  user_id: string;
  selected_team_ids: string[];
  status: string;
};

type ProfileRow = {
  id: string;
  auth_user_id: string | null;
};

type SquadMemberRow = {
  team_id: string;
  profile_id: string;
  joined_at: string;
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

async function updatePartialStageScores({
  supabase,
  stage,
  stageKey,
  officialTeamIds,
}: {
  supabase: ReturnType<typeof createServiceClient>;
  stage: StageRow;
  stageKey: string;
  officialTeamIds: string[];
}) {
  const { data: predictionRows, error: predictionError } = await supabase
    .from("user_stage_predictions")
    .select("id, user_id, selected_team_ids, status")
    .eq("stage_key", stageKey)
    .in("status", ["submitted", "locked"]);

  if (predictionError) throw new Error(predictionError.message);

  const predictions = (predictionRows ?? []) as StagePrediction[];
  if (!predictions.length) {
    return { updatedPredictions: 0, pointTransactions: 0 };
  }

  const userIds = [...new Set(predictions.map((row) => row.user_id))];
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, auth_user_id")
    .in("auth_user_id", userIds);

  if (profileError) throw new Error(profileError.message);

  const profiles = (profileRows ?? []) as ProfileRow[];
  const profileByUserId = new Map(
    profiles
      .filter((profile) => profile.auth_user_id)
      .map((profile) => [profile.auth_user_id as string, profile]),
  );
  const profileIds = profiles.map((profile) => profile.id);

  const { data: memberRows, error: memberError } = profileIds.length
    ? await supabase
        .from("squad_team_members")
        .select("team_id, profile_id, joined_at")
    : { data: [], error: null };

  if (memberError) throw new Error(memberError.message);

  const members = ((memberRows ?? []) as SquadMemberRow[]).filter((member) =>
    new Date(member.joined_at).getTime() <= new Date(stage.due_at).getTime(),
  );
  const memberProfileIds = [...new Set(members.map((member) => member.profile_id))];
  const missingProfileIds = memberProfileIds.filter((id) => !profiles.some((profile) => profile.id === id));
  let memberProfiles = profiles;

  if (missingProfileIds.length) {
    const { data: extraProfiles, error: extraProfileError } = await supabase
      .from("profiles")
      .select("id, auth_user_id")
      .in("id", missingProfileIds);

    if (extraProfileError) throw new Error(extraProfileError.message);
    memberProfiles = [...profiles, ...((extraProfiles ?? []) as ProfileRow[])];
  }

  const userIdByProfileId = new Map(
    memberProfiles
      .filter((profile) => profile.auth_user_id)
      .map((profile) => [profile.id, profile.auth_user_id as string]),
  );
  const membersByTeam = new Map<string, SquadMemberRow[]>();
  const membershipsByProfile = new Map<string, SquadMemberRow[]>();

  for (const member of members) {
    const teamMembers = membersByTeam.get(member.team_id) ?? [];
    teamMembers.push(member);
    membersByTeam.set(member.team_id, teamMembers);

    const profileMemberships = membershipsByProfile.get(member.profile_id) ?? [];
    profileMemberships.push(member);
    membershipsByProfile.set(member.profile_id, profileMemberships);
  }

  const personalByUserId = new Map<string, number>();
  const correctCountByUserId = new Map<string, number>();

  for (const prediction of predictions) {
    const selectedIds = prediction.selected_team_ids ?? [];
    const correctCount = selectedIds.filter((id) => officialTeamIds.includes(id)).length;
    const personalPoints = correctCount * Number(stage.points_per_correct ?? 0);
    correctCountByUserId.set(prediction.user_id, correctCount);
    personalByUserId.set(prediction.user_id, personalPoints);
  }

  function teamForProfile(profileId: string) {
    const eligible = (membershipsByProfile.get(profileId) ?? [])
      .filter((member) => (membersByTeam.get(member.team_id) ?? []).length >= 2)
      .sort(
        (a, b) =>
          new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
      );

    return eligible[0]?.team_id ?? null;
  }

  function teamPoints(teamId: string | null) {
    if (!teamId) return 0;
    return (membersByTeam.get(teamId) ?? []).reduce((sum, member) => {
      const userId = userIdByProfileId.get(member.profile_id);
      return sum + (userId ? personalByUserId.get(userId) ?? 0 : 0);
    }, 0);
  }

  let updatedPredictions = 0;
  let pointTransactions = 0;

  for (const prediction of predictions) {
    const profile = profileByUserId.get(prediction.user_id);
    const personalPoints = personalByUserId.get(prediction.user_id) ?? 0;
    const correctCount = correctCountByUserId.get(prediction.user_id) ?? 0;
    const accumulatedTeamPoints = profile ? teamPoints(teamForProfile(profile.id)) : 0;
    const finalPoints = personalPoints + accumulatedTeamPoints;

    const update = await supabase
      .from("user_stage_predictions")
      .update({
        correct_count: correctCount,
        bonus_earned: 0,
        points_earned: finalPoints,
        personal_correct_score: personalPoints,
        team_accumulated_score: accumulatedTeamPoints,
        final_earned_score: finalPoints,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prediction.id);

    if (update.error) throw new Error(update.error.message);
    updatedPredictions += 1;

    const transaction = await supabase.from("point_transactions").upsert(
      {
        user_id: prediction.user_id,
        source_type: "road_to_champion",
        stage_key: stageKey,
        points: finalPoints,
        description: `${stageKey} partial live score`,
      },
      { onConflict: "user_id,source_type,stage_key" },
    );

    if (transaction.error) throw new Error(transaction.error.message);
    pointTransactions += 1;
  }

  return { updatedPredictions, pointTransactions };
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
        .select("stage_key, required_selection_count, status, due_at, points_per_correct"),
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

    if (winnerIds.length === 0) {
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

    await supabase.from("stage_results").upsert(
      {
        stage_key: rule.stageKey,
        official_team_ids: winnerIds,
        is_simulation: false,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stage_key,is_simulation" },
    );

    if (winnerIds.length !== requiredCount) {
      const partial = await updatePartialStageScores({
        supabase,
        stage,
        stageKey: rule.stageKey,
        officialTeamIds: winnerIds,
      });

      await supabase.rpc("rebuild_final_score_summaries");

      details.push({
        stageKey: rule.stageKey,
        status: "partial_scored",
        expectedWinners: requiredCount,
        detectedWinners: winnerIds.length,
        finishedMatches: finishedMatches.length,
        updatedPredictions: partial.updatedPredictions,
        pointTransactions: partial.pointTransactions,
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
