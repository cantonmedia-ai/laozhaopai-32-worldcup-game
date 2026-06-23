import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

export type LiveMonitorFilters = {
  from?: string;
  to?: string;
  status?: string;
  actionType?: string;
  errorType?: string;
  area?: string;
  user?: string;
  teamName?: string;
  referralCode?: string;
};

export type UserActionLogRow = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  nickname: string | null;
  action_type: string;
  action_status: "success" | "failed" | "warning" | "info";
  page_path: string | null;
  game_key: string | null;
  match_id: string | null;
  team_id: string | null;
  referral_code: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SystemErrorLogRow = {
  id: string;
  error_reference_id: string;
  user_id: string | null;
  user_email: string | null;
  error_type: string;
  error_message: string;
  error_stack: string | null;
  page_path: string | null;
  function_name: string | null;
  game_key: string | null;
  match_id: string | null;
  team_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type LiveMonitorData = {
  actions: UserActionLogRow[];
  errors: SystemErrorLogRow[];
  summary: Record<string, number | string>;
  alerts: Array<{ label: string; level: "warning" | "critical"; message: string }>;
};

function todayIsoStart() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function tenMinutesAgo() {
  return new Date(Date.now() - 10 * 60 * 1000).toISOString();
}

function areaGameKey(area?: string) {
  if (area === "game1") return "game1";
  if (area === "game2") return "game2";
  if (area === "team") return "team";
  if (area === "admin") return "admin";
  return "";
}

function applyActionFilters(query: any, filters: LiveMonitorFilters) {
  let next = query;
  if (filters.from) next = next.gte("created_at", new Date(filters.from).toISOString());
  if (filters.to) next = next.lte("created_at", new Date(filters.to).toISOString());
  if (filters.status) next = next.eq("action_status", filters.status);
  if (filters.actionType) next = next.eq("action_type", filters.actionType);
  if (filters.referralCode) next = next.ilike("referral_code", `%${filters.referralCode}%`);
  const gameKey = areaGameKey(filters.area);
  if (gameKey) next = next.eq("game_key", gameKey);
  if (filters.user) {
    next = next.or(`user_email.ilike.%${filters.user}%,nickname.ilike.%${filters.user}%`);
  }
  return next;
}

function applyErrorFilters(query: any, filters: LiveMonitorFilters) {
  let next = query;
  if (filters.from) next = next.gte("created_at", new Date(filters.from).toISOString());
  if (filters.to) next = next.lte("created_at", new Date(filters.to).toISOString());
  if (filters.errorType) next = next.eq("error_type", filters.errorType);
  const gameKey = areaGameKey(filters.area);
  if (gameKey) next = next.eq("game_key", gameKey);
  if (filters.user) {
    next = next.or(`user_email.ilike.%${filters.user}%`);
  }
  return next;
}

async function countActions(actionTypes: string[], since = todayIsoStart(), status?: string) {
  if (!hasSupabaseServiceEnv()) return 0;
  const supabase = createServiceClient();
  let query = supabase
    .from("user_action_logs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    .in("action_type", actionTypes);
  if (status) query = query.eq("action_status", status);
  const { count } = await query;
  return count ?? 0;
}

async function countErrors(since = todayIsoStart(), errorType?: string) {
  if (!hasSupabaseServiceEnv()) return 0;
  const supabase = createServiceClient();
  let query = supabase
    .from("system_error_logs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (errorType) query = query.eq("error_type", errorType);
  const { count } = await query;
  return count ?? 0;
}

async function getLastActionTime(actionTypes: string[]) {
  if (!hasSupabaseServiceEnv()) return "No record";
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_action_logs")
    .select("created_at")
    .in("action_type", actionTypes)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.created_at ? new Date(data.created_at).toLocaleString("en-MY") : "No record";
}

export async function loadLiveMonitorData(filters: LiveMonitorFilters): Promise<LiveMonitorData> {
  if (!hasSupabaseServiceEnv()) {
    return {
      actions: [],
      errors: [],
      summary: {},
      alerts: [
        {
          label: "Service role missing",
          level: "critical",
          message: "Supabase service role is not configured.",
        },
      ],
    };
  }

  const supabase = createServiceClient();
  const actionsQuery = applyActionFilters(
    supabase.from("user_action_logs").select("*").order("created_at", { ascending: false }).limit(100),
    filters,
  );
  const errorsQuery = applyErrorFilters(
    supabase.from("system_error_logs").select("*").order("created_at", { ascending: false }).limit(100),
    filters,
  );

  const [
    actionsResult,
    errorsResult,
    totalPlayersResult,
    newSignups,
    loginFailures,
    game1Submissions,
    game1FailedSubmissions,
    game2Submissions,
    game2FailedSubmissions,
    teamJoinAttempts,
    teamJoinFailures,
    autoCreatedTeams,
    systemErrors,
    scoreErrors,
    permissionErrors,
    apiErrors,
    failedSubmissions10,
    loginFailures10,
    teamJoinFailures10,
    lastScoreCalculationTime,
    lastOfficialResultUpdateTime,
  ] = await Promise.all([
    actionsQuery,
    errorsQuery,
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIsoStart()),
    countActions(["signup_completed"]),
    countActions(["login_failed"]),
    countActions(["game1_submit_success"]),
    countActions(["game1_submit_failed", "game1_blocked_by_deadline"]),
    countActions(["game2_match_submit_success"]),
    countActions(["game2_match_submit_failed", "game2_match_blocked_by_deadline"]),
    countActions(["team_join_attempt"]),
    countActions(["team_join_failed"]),
    countActions(["team_auto_created"]),
    countErrors(),
    countErrors(todayIsoStart(), "scoring_error"),
    countErrors(todayIsoStart(), "permission_error"),
    countErrors(todayIsoStart(), "api_error"),
    countActions(["game1_submit_failed", "game2_match_submit_failed"], tenMinutesAgo()),
    countActions(["login_failed"], tenMinutesAgo()),
    countActions(["team_join_failed"], tenMinutesAgo()),
    getLastActionTime(["score_rerun_success", "simulation_run_success"]),
    getLastActionTime(["official_result_update_success"]),
  ]);

  const actions = ((actionsResult.data ?? []) as UserActionLogRow[]);
  const errors = ((errorsResult.data ?? []) as SystemErrorLogRow[]);
  const summary = {
    totalPlayersToday: totalPlayersResult.count ?? 0,
    newSignupsToday: newSignups,
    loginFailuresToday: loginFailures,
    game1SubmissionsToday: game1Submissions,
    game1FailedSubmissionsToday: game1FailedSubmissions,
    game2SubmissionsToday: game2Submissions,
    game2FailedSubmissionsToday: game2FailedSubmissions,
    teamJoinAttemptsToday: teamJoinAttempts,
    teamJoinFailuresToday: teamJoinFailures,
    autoCreatedTeamsToday: autoCreatedTeams,
    systemErrorsToday: systemErrors,
    lastScoreCalculationTime,
    lastOfficialResultUpdateTime,
  };

  const alerts: LiveMonitorData["alerts"] = [];
  if (failedSubmissions10 > 5) alerts.push({ label: "Failed submissions", level: "critical", message: `${failedSubmissions10} failed submissions in 10 minutes.` });
  if (loginFailures10 > 5) alerts.push({ label: "Login failures", level: "warning", message: `${loginFailures10} login failures in 10 minutes.` });
  if (teamJoinFailures10 > 3) alerts.push({ label: "Team join failures", level: "critical", message: `${teamJoinFailures10} team join failures in 10 minutes.` });
  if (scoreErrors > 0) alerts.push({ label: "Scoring error", level: "critical", message: `${scoreErrors} scoring errors today.` });
  if (permissionErrors > 0) alerts.push({ label: "Permission error", level: "warning", message: `${permissionErrors} permission errors today.` });
  if (apiErrors > 0) alerts.push({ label: "Football API", level: "warning", message: `${apiErrors} API errors today.` });
  if (errors.some((error) => String(error.metadata?.deadlineMissing ?? "") === "true")) {
    alerts.push({ label: "Deadline missing", level: "warning", message: "A deadline-related error is missing API time." });
  }
  if (actions.some((action) => String(action.metadata?.isSimulationPublic ?? "") === "true")) {
    alerts.push({ label: "Simulation data", level: "critical", message: "Simulation data may appear in public leaderboard." });
  }

  return { actions, errors, summary, alerts };
}

export function liveIssueReport(data: LiveMonitorData) {
  const latestErrors = data.errors.slice(0, 10).map((error) =>
    `- ${new Date(error.created_at).toLocaleString("en-MY")} ${error.error_reference_id} ${error.error_type}: ${error.error_message}`,
  );
  const failedActions = data.actions
    .filter((action) => action.action_status === "failed" || action.action_status === "warning")
    .slice(0, 10)
    .map((action) =>
      `- ${new Date(action.created_at).toLocaleString("en-MY")} ${action.user_email ?? action.nickname ?? "Unknown"} ${action.action_type}: ${action.message ?? ""}`,
    );

  return [
    `Generated time: ${new Date().toLocaleString("en-MY")}`,
    `Total users today: ${data.summary.totalPlayersToday ?? 0}`,
    `Failed submissions today: ${(Number(data.summary.game1FailedSubmissionsToday) || 0) + (Number(data.summary.game2FailedSubmissionsToday) || 0)}`,
    `System errors today: ${data.summary.systemErrorsToday ?? 0}`,
    `Team join failures today: ${data.summary.teamJoinFailuresToday ?? 0}`,
    "",
    "Top 10 latest errors:",
    latestErrors.length ? latestErrors.join("\n") : "- No errors",
    "",
    "Top 10 failed user actions:",
    failedActions.length ? failedActions.join("\n") : "- No failed actions",
    "",
    "Suggested issues to check:",
    data.alerts.length ? data.alerts.map((alert) => `- ${alert.message}`).join("\n") : "- No active warning.",
  ].join("\n");
}

export function logsToCsv(actions: UserActionLogRow[], errors: SystemErrorLogRow[]) {
  const rows = [
    ["type", "time", "user", "event", "status", "page", "message", "reference"],
    ...actions.map((action) => [
      "action",
      action.created_at,
      action.user_email ?? action.nickname ?? "",
      action.action_type,
      action.action_status,
      action.page_path ?? "",
      action.message ?? "",
      "",
    ]),
    ...errors.map((error) => [
      "error",
      error.created_at,
      error.user_email ?? "",
      error.error_type,
      "failed",
      error.page_path ?? "",
      error.error_message,
      error.error_reference_id,
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}
