import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";
import type { EmailSettings, EmailTemplate, EmailType } from "@/lib/email/types";

export const fallbackSettings: EmailSettings = {
  sender_name: "Brainwave Games",
  sender_email: "hello@brainwaveai.my",
  reply_to_email: "hello@brainwaveai.my",
  test_recipient_email: null,
  automation_enabled: true,
  send_only_verified: true,
  send_only_incomplete: true,
  do_not_send_after_deadline: true,
  do_not_duplicate_timing: true,
  do_not_send_unsubscribed: true,
};

export const fallbackTemplates: EmailTemplate[] = [
  {
    type: "verify_email",
    subject: "Verify Your Brainwave Games Account",
    preview_text: "Verify your email to start playing.",
    body: "Welcome to Brainwave Games.\n\nVerify your email to submit predictions, join teams, earn points and claim rewards.",
    cta_text: "Verify Email",
    cta_url: "/api/email/verify",
    enabled: true,
  },
  {
    type: "welcome",
    subject: "Welcome to Brainwave Games",
    preview_text: "Start making your predictions and climb the leaderboard.",
    body: "Welcome to Brainwave Games.\n\nStart making your predictions and climb the leaderboard.",
    cta_text: "Start Playing",
    cta_url: "/game",
    enabled: true,
  },
  {
    type: "incomplete_prediction_3day",
    subject: "Your Prediction Is Not Complete",
    preview_text: "Complete before the deadline.",
    body: "You have not completed your current round prediction.\n\nComplete before the deadline.",
    cta_text: "Continue Prediction",
    cta_url: "/road-to-champion",
    enabled: true,
  },
  {
    type: "incomplete_prediction_24hour",
    subject: "24 Hours Left To Submit",
    preview_text: "Submit before the deadline.",
    body: "Your prediction is still incomplete.\n\nSubmit before the deadline.",
    cta_text: "Submit Prediction",
    cta_url: "/road-to-champion",
    enabled: true,
  },
  {
    type: "incomplete_prediction_2hour",
    subject: "Final Reminder Before Deadline",
    preview_text: "Prediction closes soon.",
    body: "Prediction closes soon.\n\nSubmit now.",
    cta_text: "Submit Now",
    cta_url: "/road-to-champion",
    enabled: true,
  },
  {
    type: "new_round_open",
    subject: "New Prediction Round Open",
    preview_text: "A new prediction round is now available.",
    body: "A new prediction round is now available.",
    cta_text: "Predict Now",
    cta_url: "/road-to-champion",
    enabled: true,
  },
  {
    type: "ranking_update",
    subject: "Your Ranking Has Been Updated",
    preview_text: "See your new ranking after the result.",
    body: "Your ranking summary is ready. Check your points and leaderboard position.",
    cta_text: "View Ranking",
    cta_url: "/leaderboard",
    enabled: true,
  },
  {
    type: "winner",
    subject: "Congratulations! You Won",
    preview_text: "You have won a prize in Brainwave Games.",
    body: "Congratulations! You have won a prize in Brainwave Games.",
    cta_text: "View Results",
    cta_url: "/results",
    enabled: true,
  },
];

export const fallbackRules = [
  { reminder_type: "incomplete_prediction_3day", hours_before_deadline: 72, enabled: true },
  { reminder_type: "incomplete_prediction_24hour", hours_before_deadline: 24, enabled: true },
  { reminder_type: "incomplete_prediction_2hour", hours_before_deadline: 2, enabled: true },
];

export async function getEmailState() {
  if (!hasSupabaseServiceEnv()) {
    return {
      settings: fallbackSettings,
      templates: fallbackTemplates,
      rules: fallbackRules,
      logs: [],
      queue: [],
      stats: {
        verifiedUsers: 0,
        unverifiedUsers: 0,
        emailsSentToday: 0,
        reminderQueue: 0,
        failedEmails: 0,
        winnerEmails: 0,
      },
    };
  }

  const supabase = createServiceClient();
  const [
    settingsResult,
    templatesResult,
    rulesResult,
    logsResult,
    queueResult,
    verifiedResult,
    unverifiedResult,
    sentTodayResult,
    failedResult,
    winnerResult,
  ] = await Promise.all([
    supabase.from("email_settings").select("*").limit(1).maybeSingle(),
    supabase.from("email_templates").select("*").order("type"),
    supabase.from("email_reminder_rules").select("*").order("hours_before_deadline", { ascending: false }),
    supabase.from("email_logs").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("email_queue").select("*").order("scheduled_for", { ascending: true }).limit(50),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("email_verified", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("email_verified", false),
    supabase
      .from("email_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("email_logs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("email_logs").select("id", { count: "exact", head: true }).eq("email_type", "winner"),
  ]);

  const dbTemplates = (templatesResult.data as EmailTemplate[] | null) ?? [];
  const missingTemplates = fallbackTemplates.filter(
    (fallback) => !dbTemplates.some((template) => template.type === fallback.type),
  );

  if (missingTemplates.length) {
    await supabase.from("email_templates").upsert(missingTemplates, {
      onConflict: "type",
      ignoreDuplicates: true,
    });
  }

  const templates = fallbackTemplates.map(
    (fallback) =>
      dbTemplates.find((template) => template.type === fallback.type) ?? fallback,
  );
  const extraTemplates = dbTemplates.filter(
    (template) => !fallbackTemplates.some((fallback) => fallback.type === template.type),
  );
  const queue = queueResult.data ?? [];

  return {
    settings: (settingsResult.data as EmailSettings | null) ?? fallbackSettings,
    templates: [...templates, ...extraTemplates],
    rules: rulesResult.data ?? fallbackRules,
    logs: logsResult.data ?? [],
    queue,
    stats: {
      verifiedUsers: verifiedResult.count ?? 0,
      unverifiedUsers: unverifiedResult.count ?? 0,
      emailsSentToday: sentTodayResult.count ?? 0,
      reminderQueue: queue.filter((row) => String(row.email_type).includes("incomplete_prediction")).length,
      failedEmails: failedResult.count ?? 0,
      winnerEmails: winnerResult.count ?? 0,
    },
  };
}

export function templateByType(templates: EmailTemplate[], type: EmailType | string) {
  return templates.find((template) => template.type === type) ?? fallbackTemplates[0];
}
