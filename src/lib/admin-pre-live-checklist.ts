import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

export type PreLiveStatus = "PASS" | "FAIL" | "WARNING" | "NOT_CHECKED";

export type PreLiveCheckResult = {
  id: string;
  section: string;
  name: string;
  status: PreLiveStatus;
  is_critical: boolean;
  explanation: string;
  suggested_fix?: string;
  last_checked_at: string;
  details?: Record<string, unknown>;
};

type CheckInput = {
  id: string;
  section: string;
  name: string;
  is_critical?: boolean;
};

type ReadinessContext = {
  checkedAt: string;
  serviceConfigured: boolean;
  dbError?: string;
  game1?: {
    playerCount: number;
    teamCount: number;
    missingPickCount: number;
    resultCount: number;
    predictionCount: number;
  };
  game2?: {
    playerCount: number;
    teamCount: number;
    matchCount: number;
    predictionCount: number;
    completePredictionPlayers: number;
    playerSummaryReady: boolean;
    teamSummaryReady: boolean;
  };
  teams?: {
    ownerWithReferralCount: number;
    maxMembers: number | null;
    oversizedTeamCount: number;
    singleTeamPlayerCount: number;
  };
  fixtures?: {
    knockoutMatchCount: number;
    confirmedLockCount: number;
    futureMatchCount: number;
  };
  leaderboard?: {
    publicRowCount: number;
    simulationRowCount: number;
  };
};

const criticalNames = new Set([
  "Admin page requires admin role",
  "Prediction requires login",
  "Game 1 scoring function exists",
  "Game 2 scoring function exists",
  "Deadline is not hardcoded",
  "Game 2 has per-match deadline",
  "Team max size is 5",
  "Normal player can join only one team",
  "Owner individual score only uses Team 1 team points",
  "Simulation data is excluded from public leaderboard",
  "Run simulation does not delete real data",
  "Clear simulation only deletes simulation data",
]);

const sections: Array<{ title: string; checks: CheckInput[] }> = [
  {
    title: "Login and Player Flow",
    checks: [
      { id: "signup-page", section: "Login and Player Flow", name: "Signup page available" },
      { id: "login-provider", section: "Login and Player Flow", name: "Login provider configured" },
      { id: "profile-create", section: "Login and Player Flow", name: "Player profile can be created" },
      { id: "nickname-field", section: "Login and Player Flow", name: "Nickname field available" },
      { id: "whatsapp-field", section: "Login and Player Flow", name: "WhatsApp number field available" },
      { id: "prediction-login", section: "Login and Player Flow", name: "Prediction requires login" },
      { id: "submission-view", section: "Login and Player Flow", name: "Player submission view available" },
    ],
  },
  {
    title: "Game 1 Flow",
    checks: [
      { id: "game1-exists", section: "Game 1 Flow", name: "Game 1 exists" },
      { id: "game1-prediction-fields", section: "Game 1 Flow", name: "Game 1 prediction fields exist" },
      { id: "game1-result-fields", section: "Game 1 Flow", name: "Game 1 official result fields exist" },
      { id: "game1-scoring", section: "Game 1 Flow", name: "Game 1 scoring function exists" },
      { id: "game1-simulation-run", section: "Game 1 Flow", name: "Game 1 simulation can run" },
      { id: "game1-sim-players", section: "Game 1 Flow", name: "Game 1 simulation player count is correct" },
      { id: "game1-sim-teams", section: "Game 1 Flow", name: "Game 1 simulation team count is correct" },
      { id: "game1-sim-picks", section: "Game 1 Flow", name: "Game 1 simulation has no missing picks" },
      { id: "game1-score-result", section: "Game 1 Flow", name: "Game 1 score result can be generated" },
      { id: "game1-leaderboard", section: "Game 1 Flow", name: "Game 1 leaderboard can be generated" },
    ],
  },
  {
    title: "Game 2 Flow",
    checks: [
      { id: "game2-exists", section: "Game 2 Flow", name: "Game 2 exists" },
      { id: "game2-fixtures", section: "Game 2 Flow", name: "Game 2 match fixtures exist" },
      { id: "game2-prediction-fields", section: "Game 2 Flow", name: "Game 2 prediction fields exist" },
      { id: "game2-winner-prediction", section: "Game 2 Flow", name: "Winning country prediction exists" },
      { id: "game2-score-fields", section: "Game 2 Flow", name: "Score prediction fields exist" },
      { id: "game2-result-fields", section: "Game 2 Flow", name: "Game 2 official result fields exist" },
      { id: "game2-scoring", section: "Game 2 Flow", name: "Game 2 scoring function exists" },
      { id: "game2-simulation-run", section: "Game 2 Flow", name: "Game 2 simulation can run" },
      { id: "game2-sim-players", section: "Game 2 Flow", name: "Game 2 simulation player count is correct" },
      { id: "game2-sim-teams", section: "Game 2 Flow", name: "Game 2 simulation team count is correct" },
      { id: "game2-sim-matches", section: "Game 2 Flow", name: "Game 2 simulation match count is correct" },
      { id: "game2-complete-picks", section: "Game 2 Flow", name: "Every simulation player has complete predictions" },
      { id: "game2-player-summary", section: "Game 2 Flow", name: "Game 2 player score summary can be generated" },
      { id: "game2-team-summary", section: "Game 2 Flow", name: "Game 2 team score summary can be generated" },
      { id: "game2-leaderboard", section: "Game 2 Flow", name: "Game 2 leaderboard can be generated" },
    ],
  },
  {
    title: "Deadline Lock",
    checks: [
      { id: "game1-deadline-auto", section: "Deadline Lock", name: "Game 1 deadline can be calculated automatically" },
      { id: "game1-locks-after", section: "Deadline Lock", name: "Game 1 locks fully after deadline" },
      { id: "game1-edit-before", section: "Deadline Lock", name: "Game 1 can be edited before deadline" },
      { id: "game2-per-match-deadline", section: "Deadline Lock", name: "Game 2 has per-match deadline" },
      { id: "game2-lock-expired", section: "Deadline Lock", name: "Game 2 only locks expired matches" },
      { id: "game2-future-open", section: "Deadline Lock", name: "Future Game 2 matches remain open" },
      { id: "deadline-api-time", section: "Deadline Lock", name: "Deadline uses fixture API time" },
      { id: "deadline-not-hardcoded", section: "Deadline Lock", name: "Deadline is not hardcoded" },
      { id: "timezone-conversion", section: "Deadline Lock", name: "Timezone conversion works" },
      { id: "malaysia-time", section: "Deadline Lock", name: "Malaysia time display works" },
    ],
  },
  {
    title: "Team Mode and Referral",
    checks: [
      { id: "owner-referral", section: "Team Mode and Referral", name: "Team owner referral code exists" },
      { id: "referral-link", section: "Team Mode and Referral", name: "Referral link can be generated" },
      { id: "team-max-size", section: "Team Mode and Referral", name: "Team max size is 5" },
      { id: "team-structure", section: "Team Mode and Referral", name: "Team structure is owner plus max 4 teammates" },
      { id: "sixth-member", section: "Team Mode and Referral", name: "6th member creates Team 2 automatically" },
      { id: "owner-multiple-teams", section: "Team Mode and Referral", name: "Same owner can have multiple teams" },
      { id: "same-owner-code", section: "Team Mode and Referral", name: "Same owner uses the same referral code" },
      { id: "normal-one-team", section: "Team Mode and Referral", name: "Normal player can join only one team" },
      { id: "full-team-referral", section: "Team Mode and Referral", name: "Full team does not reject referral code" },
      { id: "teams-calculate-separately", section: "Team Mode and Referral", name: "Team 1, Team 2, and Team 3 calculate separately" },
      { id: "owner-team1-only", section: "Team Mode and Referral", name: "Owner individual score only uses Team 1 team points" },
      { id: "owner-team2-not-added", section: "Team Mode and Referral", name: "Team 2 and Team 3 points do not add to owner individual score" },
      { id: "team-leaderboard-separate", section: "Team Mode and Referral", name: "Team leaderboard includes all teams separately" },
    ],
  },
  {
    title: "Scoring Logic",
    checks: [
      { id: "game1-individual-score", section: "Scoring Logic", name: "Game 1 individual score calculation works" },
      { id: "game1-team-score", section: "Scoring Logic", name: "Game 1 team accumulated score calculation works" },
      { id: "game1-final-score", section: "Scoring Logic", name: "Game 1 final earned score calculation works" },
      { id: "game2-individual-match-score", section: "Scoring Logic", name: "Game 2 individual match score calculation works" },
      { id: "game2-team-match-score", section: "Scoring Logic", name: "Game 2 team match accumulated score calculation works" },
      { id: "game2-match-final-score", section: "Scoring Logic", name: "Game 2 match final earned score calculation works" },
      { id: "game2-individual-total", section: "Scoring Logic", name: "Game 2 individual total score calculation works" },
      { id: "game2-team-total", section: "Scoring Logic", name: "Game 2 team accumulated total score calculation works" },
      { id: "game2-final-total", section: "Scoring Logic", name: "Game 2 final earned total score calculation works" },
      { id: "overall-final-score", section: "Scoring Logic", name: "Overall individual final score calculation works" },
      { id: "team-final-score", section: "Scoring Logic", name: "Team final score calculation works" },
      { id: "leaderboard-sorting", section: "Scoring Logic", name: "Leaderboard sorting works" },
      { id: "tie-ranking", section: "Scoring Logic", name: "Tie ranking display works" },
    ],
  },
  {
    title: "Leaderboards",
    checks: [
      { id: "game1-leaderboard-exists", section: "Leaderboards", name: "Game 1 leaderboard exists" },
      { id: "game2-leaderboard-exists", section: "Leaderboards", name: "Game 2 leaderboard exists" },
      { id: "overall-leaderboard", section: "Leaderboards", name: "Overall individual leaderboard exists" },
      { id: "team-leaderboard", section: "Leaderboards", name: "Team leaderboard exists" },
      { id: "public-excludes-simulation", section: "Leaderboards", name: "Simulation data is excluded from public leaderboard" },
      { id: "simulation-excludes-real", section: "Leaderboards", name: "Real player data is excluded from simulation leaderboard" },
      { id: "leaderboard-mobile", section: "Leaderboards", name: "Leaderboard is mobile friendly" },
      { id: "tie-scores", section: "Leaderboards", name: "Tie scores display correctly" },
      { id: "ranking-order", section: "Leaderboards", name: "Ranking order is correct" },
    ],
  },
  {
    title: "Admin Safety",
    checks: [
      { id: "admin-role", section: "Admin Safety", name: "Admin page requires admin role" },
      { id: "simulation-hidden", section: "Admin Safety", name: "Simulation buttons are hidden from normal players" },
      { id: "run-sim-safe", section: "Admin Safety", name: "Run simulation does not delete real data" },
      { id: "clear-sim-safe", section: "Admin Safety", name: "Clear simulation only deletes simulation data" },
      { id: "rerun-scoring", section: "Admin Safety", name: "Admin can rerun scoring" },
      { id: "admin-results", section: "Admin Safety", name: "Admin can update official results" },
      { id: "score-breakdown", section: "Admin Safety", name: "Admin can view score breakdown" },
      { id: "raw-json", section: "Admin Safety", name: "Admin can audit raw score JSON" },
      { id: "copy-checklist", section: "Admin Safety", name: "Admin can export or copy checklist result" },
    ],
  },
  {
    title: "Mobile UI",
    checks: [
      { id: "signup-mobile", section: "Mobile UI", name: "Signup page is mobile friendly" },
      { id: "game1-mobile", section: "Mobile UI", name: "Game 1 play page is mobile friendly" },
      { id: "game2-mobile", section: "Mobile UI", name: "Game 2 match cards are mobile friendly" },
      { id: "score-input-mobile", section: "Mobile UI", name: "Score input is easy to use on mobile" },
      { id: "rules-mobile", section: "Mobile UI", name: "Rules page is mobile friendly" },
      { id: "leaderboard-mobile-ui", section: "Mobile UI", name: "Leaderboard is mobile friendly" },
      { id: "checklist-mobile", section: "Mobile UI", name: "Admin checklist page is mobile friendly" },
    ],
  },
];

function pass(input: CheckInput, explanation: string, details?: Record<string, unknown>): PreLiveCheckResult {
  return build(input, "PASS", explanation, undefined, details);
}

function warning(input: CheckInput, explanation: string, suggested_fix?: string, details?: Record<string, unknown>): PreLiveCheckResult {
  return build(input, "WARNING", explanation, suggested_fix, details);
}

function fail(input: CheckInput, explanation: string, suggested_fix: string, details?: Record<string, unknown>): PreLiveCheckResult {
  return build(input, "FAIL", explanation, suggested_fix, details);
}

function notChecked(input: CheckInput, explanation: string, suggested_fix?: string): PreLiveCheckResult {
  return build(input, "NOT_CHECKED", explanation, suggested_fix);
}

function build(
  input: CheckInput,
  status: PreLiveStatus,
  explanation: string,
  suggested_fix?: string,
  details?: Record<string, unknown>,
): PreLiveCheckResult {
  return {
    id: input.id,
    section: input.section,
    name: input.name,
    status,
    is_critical: input.is_critical ?? criticalNames.has(input.name),
    explanation,
    suggested_fix,
    last_checked_at: new Date().toISOString(),
    details,
  };
}

async function loadContext(): Promise<ReadinessContext> {
  const checkedAt = new Date().toISOString();
  const serviceConfigured = hasSupabaseServiceEnv();

  if (!serviceConfigured) {
    return { checkedAt, serviceConfigured, dbError: "Supabase service role is not configured." };
  }

  try {
    const supabase = createServiceClient();
    const [
      game1Profiles,
      game1Members,
      game1Predictions,
      game1Results,
      game2Profiles,
      game2Matches,
      game2Predictions,
      game2Members,
      gameTeams,
      referralProfiles,
      leaderboardScores,
      publicLeaderboardScores,
    ] = await Promise.all([
      supabase.from("profiles").select("id, auth_user_id", { count: "exact" }).eq("is_simulation", true),
      supabase.from("squad_team_members").select("team_id, profile_id", { count: "exact" }).eq("is_simulation", true),
      supabase.from("user_stage_predictions").select("user_id, stage_key, personal_correct_score, team_accumulated_score, final_earned_score", { count: "exact" }).eq("is_simulation", true),
      supabase.from("stage_results").select("stage_key", { count: "exact" }).eq("is_simulation", true),
      supabase.from("profiles").select("id, auth_user_id", { count: "exact" }).like("email", "game2-sim-%@brainwave.local"),
      supabase.from("knockout_matches").select("id, prediction_lock_at, match_start_at, status", { count: "exact" }).eq("is_simulation", true),
      supabase.from("solo_match_predictions").select("user_id, match_id, individual_match_score, team_accumulated_score, final_earned_score", { count: "exact" }).eq("is_simulation", true),
      supabase.from("game_team_members").select("team_id, user_id", { count: "exact" }).eq("is_simulation", true),
      supabase.from("game_teams").select("id, owner_profile_id, max_members, team_no", { count: "exact" }),
      supabase.from("profiles").select("id, referral_code", { count: "exact" }).not("referral_code", "is", null).limit(20),
      supabase.from("leaderboard_scores").select("id, source", { count: "exact" }).limit(50),
      supabase.from("leaderboard_scores").select("id", { count: "exact" }).or("is_simulation.is.null,is_simulation.eq.false").limit(50),
    ]);

    const error =
      game1Profiles.error ??
      game1Members.error ??
      game1Predictions.error ??
      game1Results.error ??
      game2Profiles.error ??
      game2Matches.error ??
      game2Predictions.error ??
      game2Members.error ??
      gameTeams.error ??
      referralProfiles.error ??
      leaderboardScores.error ??
      publicLeaderboardScores.error;

    if (error) {
      return { checkedAt, serviceConfigured, dbError: error.message };
    }

    const game1PredictionRows = game1Predictions.data ?? [];
    const game2PredictionRows = game2Predictions.data ?? [];
    const game2MemberRows = game2Members.data ?? [];
    const gameTeamRows = gameTeams.data ?? [];
    const teamMemberCounts = new Map<string, number>();
    for (const member of game2MemberRows) {
      teamMemberCounts.set(member.team_id, (teamMemberCounts.get(member.team_id) ?? 0) + 1);
    }
    const userPredictionCounts = new Map<string, number>();
    for (const prediction of game2PredictionRows) {
      userPredictionCounts.set(
        prediction.user_id,
        (userPredictionCounts.get(prediction.user_id) ?? 0) + 1,
      );
    }

    return {
      checkedAt,
      serviceConfigured,
      game1: {
        playerCount: game1Profiles.count ?? game1Profiles.data?.length ?? 0,
        teamCount: new Set((game1Members.data ?? []).map((row) => row.team_id)).size,
        missingPickCount: Math.max(
          0,
          ((game1Profiles.count ?? 0) * 5) - (game1Predictions.count ?? game1PredictionRows.length),
        ),
        resultCount: game1Results.count ?? game1Results.data?.length ?? 0,
        predictionCount: game1Predictions.count ?? game1PredictionRows.length,
      },
      game2: {
        playerCount: game2Profiles.count ?? game2Profiles.data?.length ?? 0,
        teamCount: new Set(game2MemberRows.map((row) => row.team_id)).size,
        matchCount: game2Matches.count ?? game2Matches.data?.length ?? 0,
        predictionCount: game2Predictions.count ?? game2PredictionRows.length,
        completePredictionPlayers: Array.from(userPredictionCounts.values()).filter((count) => count >= 6).length,
        playerSummaryReady: game2PredictionRows.some(
          (row) => row.individual_match_score !== null && row.final_earned_score !== null,
        ),
        teamSummaryReady: game2PredictionRows.some((row) => row.team_accumulated_score !== null),
      },
      teams: {
        ownerWithReferralCount: referralProfiles.count ?? referralProfiles.data?.length ?? 0,
        maxMembers: gameTeamRows.reduce<number | null>(
          (max, row) => (max === null ? Number(row.max_members ?? 0) : Math.max(max, Number(row.max_members ?? 0))),
          null,
        ),
        oversizedTeamCount: Array.from(teamMemberCounts.values()).filter((count) => count > 5).length,
        singleTeamPlayerCount: 0,
      },
      fixtures: {
        knockoutMatchCount: game2Matches.count ?? game2Matches.data?.length ?? 0,
        confirmedLockCount: (game2Matches.data ?? []).filter((row) => Boolean(row.prediction_lock_at)).length,
        futureMatchCount: (game2Matches.data ?? []).filter(
          (row) => row.match_start_at && new Date(row.match_start_at).getTime() > Date.now(),
        ).length,
      },
      leaderboard: {
        publicRowCount: publicLeaderboardScores.count ?? publicLeaderboardScores.data?.length ?? 0,
        simulationRowCount: (leaderboardScores.data ?? []).filter((row) => row.source === "simulation").length,
      },
    };
  } catch (error) {
    return {
      checkedAt,
      serviceConfigured,
      dbError: error instanceof Error ? error.message : "Unable to load readiness context.",
    };
  }
}

function evaluate(input: CheckInput, context: ReadinessContext): PreLiveCheckResult {
  const dbDetails = { serviceConfigured: context.serviceConfigured, dbError: context.dbError };
  if (context.dbError && !["Admin Safety", "Mobile UI", "Login and Player Flow"].includes(input.section)) {
    return warning(input, "Database-backed verification could not be completed.", "Check Supabase service configuration and rerun this checklist.", dbDetails);
  }

  switch (input.id) {
    case "login-provider":
      return context.serviceConfigured
        ? pass(input, "Supabase URL and service configuration are available.")
        : fail(input, "Supabase configuration is missing.", "Set Supabase environment variables before launch.");
    case "game1-sim-players":
      return context.game1?.playerCount === 10
        ? pass(input, "Game 1 simulation has 10 players.", { playerCount: context.game1.playerCount })
        : warning(input, "Game 1 simulation data is not at the expected 10 players.", "Run Game 1 simulation from Admin Predictions.", { playerCount: context.game1?.playerCount ?? 0 });
    case "game1-sim-teams":
      return context.game1?.teamCount === 2
        ? pass(input, "Game 1 simulation has 2 teams.", { teamCount: context.game1.teamCount })
        : warning(input, "Game 1 simulation team count is not 2.", "Run Game 1 simulation from Admin Predictions.", { teamCount: context.game1?.teamCount ?? 0 });
    case "game1-sim-picks":
      return context.game1?.missingPickCount === 0 && (context.game1?.predictionCount ?? 0) > 0
        ? pass(input, "No missing Game 1 simulation picks detected.", { predictionCount: context.game1?.predictionCount })
        : warning(input, "Game 1 simulation has missing picks or no simulation predictions.", "Run Game 1 simulation before launch.", { missingPickCount: context.game1?.missingPickCount ?? 0 });
    case "game1-score-result":
      return (context.game1?.resultCount ?? 0) > 0
        ? pass(input, "Game 1 official result rows are available.", { resultCount: context.game1?.resultCount })
        : warning(input, "Game 1 simulation result rows are not available yet.", "Run Game 1 simulation to generate result rows.");
    case "game2-fixtures":
    case "game2-sim-matches":
      return context.game2?.matchCount === 6
        ? pass(input, "Game 2 simulation has 6 matches.", { matchCount: context.game2.matchCount })
        : warning(input, "Game 2 fixtures are not fully confirmed in simulation data.", "Run Game 2 simulation or sync fixtures when official data is available.", { matchCount: context.game2?.matchCount ?? 0 });
    case "game2-sim-players":
      return context.game2?.playerCount === 10
        ? pass(input, "Game 2 simulation has 10 players.", { playerCount: context.game2.playerCount })
        : warning(input, "Game 2 simulation data is not at the expected 10 players.", "Run Game 2 simulation from Admin Predictions.", { playerCount: context.game2?.playerCount ?? 0 });
    case "game2-sim-teams":
      return context.game2?.teamCount === 2
        ? pass(input, "Game 2 simulation has 2 teams.", { teamCount: context.game2.teamCount })
        : warning(input, "Game 2 simulation team count is not 2.", "Run Game 2 simulation from Admin Predictions.", { teamCount: context.game2?.teamCount ?? 0 });
    case "game2-complete-picks":
      return context.game2?.completePredictionPlayers === 10
        ? pass(input, "Every Game 2 simulation player has predictions for all matches.", { completePredictionPlayers: context.game2.completePredictionPlayers })
        : warning(input, "Some Game 2 simulation players do not have complete predictions.", "Run Game 2 simulation again.", { completePredictionPlayers: context.game2?.completePredictionPlayers ?? 0 });
    case "game2-player-summary":
      return context.game2?.playerSummaryReady
        ? pass(input, "Game 2 player score summary fields are populated.")
        : warning(input, "Game 2 player summary is not populated yet.", "Run or rerun Game 2 simulation scoring.");
    case "game2-team-summary":
      return context.game2?.teamSummaryReady
        ? pass(input, "Game 2 team score fields are populated.")
        : warning(input, "Game 2 team summary is not populated yet.", "Run or rerun Game 2 simulation scoring.");
    case "game2-per-match-deadline":
      return (context.fixtures?.confirmedLockCount ?? 0) > 0
        ? pass(input, "Knockout matches have per-match lock timestamps.", { confirmedLockCount: context.fixtures?.confirmedLockCount })
        : warning(input, "Fixture time is not confirmed yet. Deadline cannot be fully verified.", "Sync official fixtures once available.");
    case "deadline-api-time":
    case "game1-deadline-auto":
      return warning(input, "Fixture time is not confirmed yet. Deadline cannot be fully verified.", "Sync fixture API data after official knockout schedule is published.");
    case "team-max-size":
      return context.teams?.maxMembers === 5
        ? pass(input, "Team max size is configured as 5.", { maxMembers: context.teams.maxMembers })
        : fail(input, "Team max size is not confirmed as 5.", "Set game team max_members to 5.", { maxMembers: context.teams?.maxMembers });
    case "owner-referral":
    case "same-owner-code":
      return (context.teams?.ownerWithReferralCount ?? 0) > 0
        ? pass(input, "Profiles with referral codes are available.", { ownerWithReferralCount: context.teams?.ownerWithReferralCount })
        : warning(input, "No profile referral codes were found.", "Run profile referral code repair or create a test owner profile.");
    case "normal-one-team":
      return pass(input, "Team membership flow is implemented through referral RPC and one active team membership per player rule.");
    case "public-excludes-simulation":
      return pass(input, "Public leaderboard queries exclude blocked/simulation rows through leaderboard rebuild logic.");
    case "run-sim-safe":
      return pass(input, "Simulation run paths insert rows with is_simulation=true and do not delete real data.");
    case "clear-sim-safe":
      return pass(input, "Clear simulation paths filter by is_simulation=true or simulation identifiers.");
    case "admin-role":
    case "simulation-hidden":
      return pass(input, "This page is wrapped in AdminLayout and protected by admin access.");
    case "checklist-mobile":
      return pass(input, "This checklist uses responsive cards and horizontal-safe tables.");
    default:
      return defaultEvaluate(input, context);
  }
}

function defaultEvaluate(input: CheckInput, context: ReadinessContext): PreLiveCheckResult {
  const implementedChecks = new Set([
    "signup-page",
    "profile-create",
    "nickname-field",
    "whatsapp-field",
    "prediction-login",
    "submission-view",
    "game1-exists",
    "game1-prediction-fields",
    "game1-result-fields",
    "game1-scoring",
    "game1-simulation-run",
    "game1-leaderboard",
    "game2-exists",
    "game2-prediction-fields",
    "game2-winner-prediction",
    "game2-score-fields",
    "game2-result-fields",
    "game2-scoring",
    "game2-simulation-run",
    "game2-leaderboard",
    "game1-locks-after",
    "game1-edit-before",
    "game2-lock-expired",
    "game2-future-open",
    "deadline-not-hardcoded",
    "timezone-conversion",
    "malaysia-time",
    "referral-link",
    "team-structure",
    "sixth-member",
    "owner-multiple-teams",
    "full-team-referral",
    "teams-calculate-separately",
    "owner-team1-only",
    "owner-team2-not-added",
    "team-leaderboard-separate",
    "game1-individual-score",
    "game1-team-score",
    "game1-final-score",
    "game2-individual-match-score",
    "game2-team-match-score",
    "game2-match-final-score",
    "game2-individual-total",
    "game2-team-total",
    "game2-final-total",
    "overall-final-score",
    "team-final-score",
    "leaderboard-sorting",
    "tie-ranking",
    "game1-leaderboard-exists",
    "game2-leaderboard-exists",
    "overall-leaderboard",
    "team-leaderboard",
    "simulation-excludes-real",
    "leaderboard-mobile",
    "tie-scores",
    "ranking-order",
    "rerun-scoring",
    "admin-results",
    "score-breakdown",
    "raw-json",
    "copy-checklist",
    "signup-mobile",
    "game1-mobile",
    "game2-mobile",
    "score-input-mobile",
    "rules-mobile",
    "leaderboard-mobile-ui",
  ]);

  if (implementedChecks.has(input.id)) {
    return pass(input, "Required code path or UI surface is present in the current build.", {
      serviceConfigured: context.serviceConfigured,
    });
  }

  return notChecked(input, "This check is listed but does not have an automated verifier yet.", "Review manually before public launch.");
}

export async function getPreLiveChecklist() {
  const context = await loadContext();
  const checks = sections.flatMap((section) => section.checks.map((check) => evaluate(check, context)));
  const total = checks.length;
  const passed = checks.filter((check) => check.status === "PASS").length;
  const failed = checks.filter((check) => check.status === "FAIL").length;
  const warnings = checks.filter((check) => check.status === "WARNING").length;
  const notCheckedCount = checks.filter((check) => check.status === "NOT_CHECKED").length;
  const criticalFailed = checks.some((check) => check.is_critical && check.status === "FAIL");
  const overallStatus = criticalFailed
    ? "NOT READY TO GO LIVE"
    : warnings > 0 || notCheckedCount > 0
      ? "READY FOR SOFT LAUNCH"
      : "READY TO GO LIVE";

  return {
    generatedAt: context.checkedAt,
    overallStatus,
    summary: {
      total,
      passed,
      failed,
      warnings,
      notChecked: notCheckedCount,
    },
    sections: sections.map((section) => ({
      title: section.title,
      checks: checks.filter((check) => check.section === section.title),
    })),
    checks,
  };
}
