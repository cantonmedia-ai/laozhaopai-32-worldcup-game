import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseServerEnv } from "@/lib/supabase/server";
import { cleanReferralCode, referralStorageKey } from "@/lib/referral-code";

type CookieToSet = {
  name: string;
  value: string;
  options: Parameters<ReturnType<typeof NextResponse.next>["cookies"]["set"]>[2];
};

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/game";
  return value;
}

function getReferralCodeFromCookie(cookieHeader: string | null) {
  const rawValue = cookieHeader
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${referralStorageKey}=`))
    ?.split("=")[1];

  if (!rawValue) return "";

  try {
    return cleanReferralCode(decodeURIComponent(rawValue));
  } catch {
    return "";
  }
}

function createReferralCode() {
  return `LZP${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function friendlyExchangeError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("code verifier") ||
    lowerMessage.includes("pkce")
  ) {
    return "Google login expired. Please start login again from this same page.";
  }

  return message || "Login failed. Please try again.";
}

function isProfileComplete(profile: {
  profile_completed: boolean | null;
  display_name: string | null;
  nickname: string | null;
  phone: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
} | null) {
  return Boolean(
    profile?.profile_completed &&
      (profile.display_name || profile.nickname) &&
      (profile.phone || profile.phone_number || profile.whatsapp_number),
  );
}

function redirectWithCookies(url: string, cookiesToSet: CookieToSet[]) {
  const response = NextResponse.redirect(url);
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}

function createCallbackClient(request: NextRequest, cookiesToSet: CookieToSet[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(newCookies) {
        cookiesToSet.push(...newCookies);
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error_description");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const origin = requestUrl.origin;
  const cookiesToSet: CookieToSet[] = [];

  if (error) {
    return redirectWithCookies(
      `${origin}/login?error=${encodeURIComponent(error)}`,
      cookiesToSet,
    );
  }

  if (!hasSupabaseServerEnv() || !code) {
    return redirectWithCookies(
      `${origin}/profile-setup?demo=1&next=${encodeURIComponent(next)}`,
      cookiesToSet,
    );
  }

  const supabase = createCallbackClient(request, cookiesToSet);
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code,
  );

  if (exchangeError) {
    return redirectWithCookies(
      `${origin}/login?error=${encodeURIComponent(
        friendlyExchangeError(exchangeError.message),
      )}`,
      cookiesToSet,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectWithCookies(
      `${origin}/login?error=${encodeURIComponent("Login session not found.")}`,
      cookiesToSet,
    );
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("profile_completed, display_name, nickname, phone, phone_number, whatsapp_number")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) {
    const provider = user.app_metadata?.provider
      ? String(user.app_metadata.provider)
      : "oauth";

    const { data: createdProfile } = await supabase
      .from("profiles")
      .insert({
        auth_user_id: user.id,
        user_id: user.id,
        email: user.email,
        login_provider: provider,
        provider,
        auth_provider: provider,
        referral_code: createReferralCode(),
        profile_completed: false,
      })
      .select("profile_completed, display_name, nickname, phone, phone_number, whatsapp_number")
      .maybeSingle();

    profile = createdProfile;
  }

  const referralCode = getReferralCodeFromCookie(request.headers.get("cookie"));

  if (referralCode) {
    await supabase.rpc("accept_referral", {
      p_referral_code: referralCode,
    });
  }

  if (!isProfileComplete(profile)) {
    return redirectWithCookies(
      `${origin}/profile-setup?next=${encodeURIComponent(next)}`,
      cookiesToSet,
    );
  }

  return redirectWithCookies(`${origin}${next}`, cookiesToSet);
}
