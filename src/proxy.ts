import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const adminAccessCookie = "brainwave_admin_access";
const adminAccessValue = "brainwave_admin_ok";

const protectedRoutes = [
  "/game",
  "/road-to-champion",
  "/team-knockout",
  "/predict",
  "/leaderboard",
  "/referral",
  "/squad",
  "/team",
  "/profile",
  "/profile-setup",
  "/setup-profile",
  "/verify-email",
  "/results",
];

function isProtectedPath(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function profileIsComplete(profile: {
  profile_completed: boolean | null;
  display_name: string | null;
  nickname: string | null;
  phone: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  email_verified: boolean | null;
} | null) {
  return Boolean(
    profile?.profile_completed &&
      (profile.display_name || profile.nickname) &&
      (profile.phone || profile.phone_number || profile.whatsapp_number),
  );
}

function safeNextPath(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    !isProtectedPath(pathname) &&
    !pathname.startsWith("/admin") &&
    pathname !== "/admin-login" &&
    pathname !== "/login"
  ) {
    return NextResponse.next();
  }

  if (pathname === "/admin-login") {
    if (request.cookies.get(adminAccessCookie)?.value === adminAccessValue) {
      const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"), "/admin");
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = nextPath;
      nextUrl.search = "";
      return NextResponse.redirect(nextUrl);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (request.cookies.get(adminAccessCookie)?.value === adminAccessValue) {
      return NextResponse.next();
    }

    const adminLoginUrl = request.nextUrl.clone();
    adminLoginUrl.pathname = "/admin-login";
    adminLoginUrl.search = "";
    adminLoginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(adminLoginUrl);
  }

  const response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname === "/login") return response;
    const nextPath =
      pathname === "/profile-setup" || pathname === "/setup-profile"
        ? safeNextPath(request.nextUrl.searchParams.get("next"), "/game")
        : pathname;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, profile_completed, display_name, nickname, phone, phone_number, whatsapp_number, email_verified",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (pathname === "/login" && profileIsComplete(profile) && profile?.email_verified !== false) {
    const gameUrl = request.nextUrl.clone();
    gameUrl.pathname = "/game";
    gameUrl.search = "";
    return NextResponse.redirect(gameUrl);
  }

  if (pathname !== "/profile-setup" && !profileIsComplete(profile)) {
    const setupUrl = request.nextUrl.clone();
    setupUrl.pathname = "/profile-setup";
    setupUrl.search = "";
    setupUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(setupUrl);
  }

  if (
    pathname !== "/verify-email" &&
    profileIsComplete(profile) &&
    profile?.email_verified === false
  ) {
    const verifyUrl = request.nextUrl.clone();
    verifyUrl.pathname = "/verify-email";
    verifyUrl.search = "";
    verifyUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(verifyUrl);
  }

  if (pathname === "/verify-email" && profile?.email_verified !== false) {
    const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"), "/game");
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = nextPath;
    nextUrl.search = "";
    return NextResponse.redirect(nextUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/game/:path*",
    "/road-to-champion/:path*",
    "/team-knockout/:path*",
    "/predict/:path*",
    "/leaderboard/:path*",
    "/referral/:path*",
    "/squad/:path*",
    "/team/:path*",
    "/profile/:path*",
    "/profile-setup",
    "/setup-profile",
    "/verify-email",
    "/results/:path*",
    "/admin",
    "/admin/:path*",
    "/admin-login",
    "/login",
  ],
};
