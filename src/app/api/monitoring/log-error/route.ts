import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { logSystemError, type ErrorType } from "@/lib/monitoring";

const errorTypes = new Set([
  "auth_error",
  "database_error",
  "deadline_error",
  "scoring_error",
  "referral_error",
  "permission_error",
  "api_error",
  "validation_error",
  "unknown_error",
]);

async function getUserContext(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return { userId: null, userEmail: null };

  const response = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { userId: user?.id ?? null, userEmail: user?.email ?? null };
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  const context = await getUserContext(request);
  const errorReferenceId = await logSystemError({
    userId: context.userId,
    userEmail: context.userEmail,
    errorType: errorTypes.has(String(payload.errorType))
      ? (String(payload.errorType) as ErrorType)
      : "unknown_error",
    errorMessage: String(payload.errorMessage ?? "Unknown error"),
    errorStack: payload.errorStack,
    pagePath: payload.pagePath,
    functionName: payload.functionName,
    gameKey: payload.gameKey,
    matchId: payload.matchId,
    teamId: payload.teamId,
    requestPayloadSummary: payload.requestPayloadSummary,
    metadata: payload.metadata,
  });

  return NextResponse.json({ ok: true, errorReferenceId });
}
