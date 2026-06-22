import { NextResponse, type NextRequest } from "next/server";
import { getEmailState, templateByType } from "@/lib/email/data";
import { sendEmail } from "@/lib/email/send";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

function cronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!hasSupabaseServiceEnv()) {
    return NextResponse.json({ error: "Supabase service key is not configured." }, { status: 500 });
  }

  const supabase = createServiceClient();
  const state = await getEmailState();

  if (!state.settings.automation_enabled) {
    return NextResponse.json({ ok: true, processed: 0, skipped: "Automation disabled." });
  }

  const now = Date.now();
  const { data: stages } = await supabase
    .from("prediction_stages")
    .select("stage_key, stage_name, due_at, status")
    .eq("status", "open")
    .gt("due_at", new Date().toISOString());

  const { data: profiles } = await supabase
    .from("profiles")
    .select("auth_user_id, email, display_name, nickname, email_verified, unsubscribed_from_email")
    .not("email", "is", null);

  for (const stage of stages ?? []) {
    const dueMs = new Date(stage.due_at).getTime();
    const hoursUntilDue = (dueMs - now) / 3_600_000;

    for (const rule of state.rules) {
      if (!rule.enabled) continue;
      const windowHours = Number(rule.hours_before_deadline);
      if (hoursUntilDue > windowHours || hoursUntilDue <= windowHours - 1) continue;

      for (const profile of profiles ?? []) {
        if (!profile.auth_user_id || !profile.email) continue;
        if (state.settings.send_only_verified && profile.email_verified === false) continue;
        if (state.settings.do_not_send_unsubscribed && profile.unsubscribed_from_email) continue;

        const { data: prediction } = await supabase
          .from("user_stage_predictions")
          .select("id, status")
          .eq("user_id", profile.auth_user_id)
          .eq("stage_key", stage.stage_key)
          .maybeSingle();

        if (
          state.settings.send_only_incomplete &&
          prediction &&
          ["submitted", "locked", "scored"].includes(String(prediction.status))
        ) {
          continue;
        }

        const { data: existing } = await supabase
          .from("email_queue")
          .select("id")
          .eq("user_id", profile.auth_user_id)
          .eq("email_type", rule.reminder_type)
          .contains("payload", { stage_key: stage.stage_key })
          .neq("status", "cancelled")
          .limit(1);

        if (existing?.length) continue;

        await supabase.from("email_queue").insert({
          user_id: profile.auth_user_id,
          email_type: rule.reminder_type,
          recipient_email: profile.email,
          scheduled_for: new Date().toISOString(),
          payload: {
            display_name: profile.nickname || profile.display_name || "Player",
            game_title: "Brainwave Games",
            round_name: stage.stage_name || stage.stage_key,
            due_date: new Intl.DateTimeFormat("en-MY", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Kuala_Lumpur",
            }).format(new Date(stage.due_at)),
            cta_url: "/road-to-champion",
            stage_key: stage.stage_key,
          },
        });
      }
    }
  }

  const { data: queueRows, error } = await supabase
    .from("email_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let processed = 0;

  for (const row of queueRows ?? []) {
    const template = templateByType(state.templates, row.email_type);

    if (!template.enabled) {
      await supabase
        .from("email_queue")
        .update({
          status: "skipped",
          error_message: "Template disabled.",
          last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      continue;
    }

    const result = await sendEmail({
      to: row.recipient_email,
      template,
      settings: state.settings,
      variables: row.payload ?? {},
    });

    const nextStatus = result.ok ? "sent" : result.skipped ? "skipped" : "failed";
    await supabase
      .from("email_queue")
      .update({
        status: nextStatus,
        attempts: Number(row.attempts ?? 0) + 1,
        last_attempt_at: new Date().toISOString(),
        error_message: result.error,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    await supabase.from("email_logs").insert({
      user_id: row.user_id,
      recipient_email: result.to,
      original_recipient_email: result.originalTo,
      email_type: row.email_type,
      subject: result.subject,
      status: nextStatus,
      resend_message_id: result.messageId,
      error_message: result.error,
      sent_at: result.ok ? new Date().toISOString() : null,
    });

    processed += 1;
  }

  return NextResponse.json({ ok: true, processed });
}
