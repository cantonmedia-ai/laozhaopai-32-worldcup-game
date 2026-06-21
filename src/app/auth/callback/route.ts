import { NextResponse } from "next/server";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { cleanReferralCode, referralStorageKey } from "@/lib/referral-code";

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

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error_description");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const origin = requestUrl.origin;

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}`,
    );
  }

  if (!hasSupabaseServerEnv() || !code) {
    return NextResponse.redirect(
      `${origin}/setup-profile?demo=1&next=${encodeURIComponent(next)}`,
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code,
  );

  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Login session not found.")}`,
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_completed, display_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const referralCode = getReferralCodeFromCookie(request.headers.get("cookie"));

  if (referralCode) {
    await supabase.rpc("accept_referral", {
      p_referral_code: referralCode,
    });
  }

  if (!profile?.profile_completed || !profile.display_name) {
    return NextResponse.redirect(
      `${origin}/setup-profile?next=${encodeURIComponent(next)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
