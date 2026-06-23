import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

export type ActionStatus = "success" | "failed" | "warning" | "info";
export type ErrorType =
  | "auth_error"
  | "database_error"
  | "deadline_error"
  | "scoring_error"
  | "referral_error"
  | "permission_error"
  | "api_error"
  | "validation_error"
  | "unknown_error";

type SafeMetadata = Record<string, unknown>;

export type UserActionLogInput = {
  userId?: string | null;
  userEmail?: string | null;
  nickname?: string | null;
  actionType: string;
  actionStatus: ActionStatus;
  pagePath?: string | null;
  gameKey?: string | null;
  matchId?: string | number | null;
  teamId?: string | null;
  referralCode?: string | null;
  message?: string | null;
  metadata?: SafeMetadata | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type SystemErrorLogInput = {
  userId?: string | null;
  userEmail?: string | null;
  errorType: ErrorType;
  errorMessage: string;
  errorStack?: string | null;
  pagePath?: string | null;
  functionName?: string | null;
  gameKey?: string | null;
  matchId?: string | number | null;
  teamId?: string | null;
  requestPayloadSummary?: SafeMetadata | null;
  metadata?: SafeMetadata | null;
};

function cleanString(value: unknown, maxLength = 1000) {
  if (value === null || value === undefined) return null;
  return String(value).slice(0, maxLength);
}

function cleanObject(value: SafeMetadata | null | undefined) {
  if (!value || typeof value !== "object") return {};
  const blockedKeys = ["password", "token", "access_token", "refresh_token", "secret", "authorization"];
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !blockedKeys.some((blocked) => key.toLowerCase().includes(blocked)))
      .map(([key, entry]) => [key, typeof entry === "string" ? entry.slice(0, 500) : entry]),
  );
}

export function createErrorReferenceId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ERR-${date}-${random}`;
}

export async function logUserAction(input: UserActionLogInput) {
  try {
    if (!hasSupabaseServiceEnv()) return;
    const supabase = createServiceClient();
    await supabase.from("user_action_logs").insert({
      user_id: input.userId || null,
      user_email: cleanString(input.userEmail, 320),
      nickname: cleanString(input.nickname, 120),
      action_type: cleanString(input.actionType, 120) ?? "unknown_action",
      action_status: input.actionStatus,
      page_path: cleanString(input.pagePath, 500),
      game_key: cleanString(input.gameKey, 80),
      match_id: cleanString(input.matchId, 120),
      team_id: input.teamId || null,
      referral_code: cleanString(input.referralCode, 80),
      message: cleanString(input.message, 1200),
      metadata: cleanObject(input.metadata),
      ip_address: cleanString(input.ipAddress, 120),
      user_agent: cleanString(input.userAgent, 500),
    });
  } catch (error) {
    console.error("Monitoring user action log failed", error);
  }
}

export async function logSystemError(input: SystemErrorLogInput) {
  const errorReferenceId = createErrorReferenceId();

  try {
    if (!hasSupabaseServiceEnv()) return errorReferenceId;
    const supabase = createServiceClient();
    await supabase.from("system_error_logs").insert({
      error_reference_id: errorReferenceId,
      user_id: input.userId || null,
      user_email: cleanString(input.userEmail, 320),
      error_type: input.errorType,
      error_message: cleanString(input.errorMessage, 2000) ?? "Unknown error",
      error_stack: cleanString(input.errorStack, 4000),
      page_path: cleanString(input.pagePath, 500),
      function_name: cleanString(input.functionName, 160),
      game_key: cleanString(input.gameKey, 80),
      match_id: cleanString(input.matchId, 120),
      team_id: input.teamId || null,
      request_payload_summary: cleanObject(input.requestPayloadSummary),
      metadata: cleanObject(input.metadata),
    });
  } catch (error) {
    console.error("Monitoring system error log failed", error);
  }

  return errorReferenceId;
}
