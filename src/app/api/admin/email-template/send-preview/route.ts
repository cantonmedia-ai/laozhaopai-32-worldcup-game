import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getEmailState, templateByType } from "@/lib/email/data";
import { sendEmail } from "@/lib/email/send";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;

  const body = await request.json();
  const state = await getEmailState();
  const template = body.template ?? templateByType(state.templates, body.type || "welcome");
  const recipient = String(
    body.recipient_email || state.settings.test_recipient_email || admin.user.email || "",
  );

  if (!recipient) {
    return NextResponse.json({ error: "Preview recipient email is required." }, { status: 400 });
  }

  const result = await sendEmail({
    to: recipient,
    template,
    settings: state.settings,
    variables: {
      display_name: "球圣 1988",
      game_title: "Brainwave 世界杯竞猜赛",
      round_name: "16强争霸战",
      due_date: "28 Jun 2026, 11:59 PM",
      selected_count: "8",
      required_count: 16,
      ranking: "18",
      points: "85",
      cta_url: template.cta_url || "/game",
    },
  });

  if (hasSupabaseServiceEnv()) {
    const supabase = createServiceClient();
    await supabase.from("email_logs").insert({
      user_id: admin.user.id,
      recipient_email: result.to,
      original_recipient_email: result.originalTo,
      email_type: `preview:${template.type}`,
      subject: result.subject,
      status: result.ok ? "sent" : result.skipped ? "skipped" : "failed",
      resend_message_id: result.messageId,
      error_message: result.error,
      sent_at: result.ok ? new Date().toISOString() : null,
    });
  }

  return NextResponse.json({ ok: result.ok, result });
}
