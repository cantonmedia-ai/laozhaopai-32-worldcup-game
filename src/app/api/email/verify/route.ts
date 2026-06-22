import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  if (!hasSupabaseServiceEnv()) {
    return NextResponse.redirect(new URL("/login?error=email_not_configured", request.url));
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_verification_token", request.url));
  }

  const supabase = createServiceClient();
  const { data: tokenRow } = await supabase
    .from("email_verification_tokens")
    .select("*")
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!tokenRow) {
    return NextResponse.redirect(new URL("/login?error=invalid_or_expired_verification", request.url));
  }

  await supabase
    .from("profiles")
    .update({
      email_verified: true,
      updated_at: new Date().toISOString(),
    })
    .eq("auth_user_id", tokenRow.user_id);

  await supabase
    .from("email_verification_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return NextResponse.redirect(new URL("/login?mode=login&verified=1", request.url));
}
