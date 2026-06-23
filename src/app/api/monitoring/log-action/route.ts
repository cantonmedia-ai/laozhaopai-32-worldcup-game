import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { logUserAction, type ActionStatus } from "@/lib/monitoring";

type ProfileContext = {
  userId: string | null;
  userEmail: string | null;
  nickname: string | null;
};

function requestIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

async function getProfileContext(request: NextRequest): Promise<ProfileContext> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return { userId: null, userEmail: null, nickname: null };

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

  if (!user) return { userId: null, userEmail: null, nickname: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, nickname")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    nickname: profile?.display_name ?? profile?.nickname ?? null,
  };
}

function isActionStatus(value: unknown): value is ActionStatus {
  return value === "success" || value === "failed" || value === "warning" || value === "info";
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    const profile = await getProfileContext(request);

    await logUserAction({
      userId: profile.userId,
      userEmail: profile.userEmail,
      nickname: profile.nickname,
      actionType: String(payload.actionType ?? "unknown_action"),
      actionStatus: isActionStatus(payload.actionStatus) ? payload.actionStatus : "info",
      pagePath: payload.pagePath,
      gameKey: payload.gameKey,
      matchId: payload.matchId,
      teamId: payload.teamId,
      referralCode: payload.referralCode,
      message: payload.message,
      metadata: payload.metadata,
      ipAddress: requestIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Action log route failed", error);
    return NextResponse.json({ ok: true });
  }
}
