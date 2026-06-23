import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getEmailState, templateByType } from "@/lib/email/data";
import { sendEmail } from "@/lib/email/send";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => ({}));
  const state = await getEmailState();
  const recipient = String(
    body.recipient_email || state.settings.test_recipient_email || admin.user.email || "",
  );

  if (!recipient) {
    return NextResponse.json({ error: "Test recipient email is required." }, { status: 400 });
  }

  const template = templateByType(state.templates, "welcome");
  const result = await sendEmail({
    to: recipient,
    template,
    settings: state.settings,
    variables: { display_name: "Admin", preferred_language: "zh", cta_url: "/game" },
  });

  if (hasSupabaseServiceEnv()) {
    const supabase = createServiceClient();
    await supabase.from("email_logs").insert({
      user_id: admin.user.id,
      recipient_email: result.to,
      original_recipient_email: result.originalTo,
      email_type: "test",
      subject: result.subject,
      status: result.ok ? "sent" : result.skipped ? "skipped" : "failed",
      resend_message_id: result.messageId,
      error_message: result.error,
      sent_at: result.ok ? new Date().toISOString() : null,
    });
  }

  return NextResponse.json({ ok: result.ok, result });
}
