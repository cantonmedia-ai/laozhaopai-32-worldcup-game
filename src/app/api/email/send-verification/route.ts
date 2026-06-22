import { NextResponse, type NextRequest } from "next/server";
import { getEmailState, templateByType } from "@/lib/email/data";
import { sendEmail } from "@/lib/email/send";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  if (!hasSupabaseServiceEnv()) {
    return NextResponse.json({ error: "Email verification is not configured." }, { status: 500 });
  }

  const { email } = await request.json();
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("auth_user_id, email, display_name, nickname")
    .eq("email", cleanEmail)
    .maybeSingle();

  // Avoid email enumeration: return ok even when the address does not exist.
  if (!profile?.auth_user_id || !profile.email) {
    return NextResponse.json({ ok: true });
  }

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await supabase.from("email_verification_tokens").insert({
    user_id: profile.auth_user_id,
    email: profile.email,
    token,
  });

  const state = await getEmailState();
  const template = templateByType(state.templates, "verify_email");
  const verifyUrl = `/api/email/verify?token=${encodeURIComponent(token)}`;
  const result = await sendEmail({
    to: profile.email,
    template: { ...template, cta_url: verifyUrl },
    settings: state.settings,
    variables: {
      display_name: profile.nickname || profile.display_name || "Player",
      cta_url: verifyUrl,
    },
  });

  await supabase.from("email_logs").insert({
    user_id: profile.auth_user_id,
    recipient_email: result.to,
    original_recipient_email: result.originalTo,
    email_type: "verify_email",
    subject: result.subject,
    status: result.ok ? "sent" : result.skipped ? "skipped" : "failed",
    resend_message_id: result.messageId,
    error_message: result.error,
    sent_at: result.ok ? new Date().toISOString() : null,
  });

  return NextResponse.json({ ok: true, sent: result.ok });
}
