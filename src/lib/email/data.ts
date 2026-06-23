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
    subject: "【Brainwave Games】请验证您的邮箱 / Verify Your Email Address",
    preview_text: "请先完成邮箱验证，开始参与世界杯竞猜赛。",
    body: "欢迎加入 Brainwave Games！\n您好 {{display_name}}，感谢您注册 Brainwave Games 世界杯竞猜赛。\n在开始参与预测、加入团队和赢取奖品之前，请先完成邮箱验证。\n\nHello {{display_name}}, welcome to Brainwave Games.\nPlease verify your email before submitting predictions, joining teams, earning points and claiming prizes.",
    cta_text: "立即验证邮箱 / Verify Email",
    cta_url: "{{verification_link}}",
    enabled: true,
  },
  {
    type: "welcome",
    subject: "欢迎加入 Brainwave Games 世界杯竞猜赛！ / Welcome to Brainwave Games!",
    preview_text: "您的账户已准备好，马上开始预测冲榜。",
    body: "您好 {{display_name}}，您的账户已经成功启用。\n\n当前赛事状态：\n- 世界杯小组赛进行中\n- Game 1 已开放\n- 团队功能已开放\n- 排行榜已开放\n\nHi {{display_name}}, your account is ready.\nStart making predictions, form your team, and climb the leaderboard.",
    cta_text: "开始游戏 / Start Playing",
    cta_url: "https://games.brainwaveai.my/fifa-last-32",
    enabled: true,
  },
  {
    type: "incomplete_prediction_3day",
    subject: "您尚未完成预测 / Complete Your Prediction",
    preview_text: "请在截止时间前完成当前预测。",
    body: "您好 {{display_name}}，您尚未完成当前预测。\n当前轮次：{{round_name}}\n已选择：{{selected_count}} / {{required_count}}\n截止时间：{{due_date}}\n请在截止时间前完成提交。\n\nHi {{display_name}}, your current prediction is not complete yet.\nRound: {{round_name}}\nSelected: {{selected_count}} / {{required_count}}\nDeadline: {{due_date}}\nPlease submit before the deadline.",
    cta_text: "继续预测 / Continue Prediction",
    cta_url: "{{cta_url}}",
    enabled: true,
  },
  {
    type: "incomplete_prediction_24hour",
    subject: "24小时倒计时 / 24 Hours Remaining",
    preview_text: "距离预测截止还有24小时。",
    body: "您好 {{display_name}}，距离 {{round_name}} 预测截止还有24小时。\n截止时间：{{due_date}}\n请尽快完成提交。\n\nHi {{display_name}}, only 24 hours remain before prediction closes for {{round_name}}.\nDeadline: {{due_date}}\nSubmit your prediction before time runs out.",
    cta_text: "立即提交 / Submit Prediction",
    cta_url: "{{cta_url}}",
    enabled: true,
  },
  {
    type: "incomplete_prediction_2hour",
    subject: "最后提醒：2小时后截止 / Final Reminder: 2 Hours Left",
    preview_text: "预测即将截止，请立即提交。",
    body: "您好 {{display_name}}，预测将在2小时后截止。\n当前轮次：{{round_name}}\n截止时间：{{due_date}}\n请立即提交，避免错过积分机会。\n\nHi {{display_name}}, prediction closes in 2 hours.\nRound: {{round_name}}\nDeadline: {{due_date}}\nSubmit now before the round locks.",
    cta_text: "马上提交 / Submit Now",
    cta_url: "{{cta_url}}",
    enabled: true,
  },
  {
    type: "new_round_open",
    subject: "新一轮预测已开放 / New Prediction Round Open",
    preview_text: "{{round_name}} 预测已经开放。",
    body: "您好 {{display_name}}，新一轮预测现已开放。\n当前轮次：{{round_name}}\n请立即进入游戏参与预测，抢先冲排行榜。\n\nHi {{display_name}}, a new prediction round is now open.\nRound: {{round_name}}\nEnter the game now and make your picks.",
    cta_text: "进入新轮次 / Predict Now",
    cta_url: "{{cta_url}}",
    enabled: true,
  },
  {
    type: "ranking_update",
    subject: "排行榜更新 / Ranking Update",
    preview_text: "查看您的最新排名和积分。",
    body: "您好 {{display_name}}，您的最新排名已经更新。\n排名：{{ranking}}\n积分：{{points}}\n继续预测，冲上更高名次。\n\nHi {{display_name}}, your ranking has been updated.\nRanking: {{ranking}}\nPoints: {{points}}\nKeep playing and climb the leaderboard.",
    cta_text: "查看排行榜 / View Ranking",
    cta_url: "{{cta_url}}",
    enabled: true,
  },
  {
    type: "winner",
    subject: "恭喜获奖！ / Congratulations Winner!",
    preview_text: "恭喜您获得 Brainwave Games 奖项。",
    body: "您好 {{display_name}}，恭喜您获得 Brainwave Games 世界杯竞猜赛奖项！\n您的最新排名：{{ranking}}\n积分：{{points}}\n请登录查看领奖详情，我们也会通过您提供的联系方式通知您。\n\nHi {{display_name}}, congratulations! You have won a Brainwave Games prize.\nRanking: {{ranking}}\nPoints: {{points}}\nLog in to view your prize details.",
    cta_text: "查看领奖详情 / View Prize",
    cta_url: "{{cta_url}}",
    enabled: true,
  },
];

export const fallbackRules = [
  { reminder_type: "incomplete_prediction_3day", hours_before_deadline: 72, enabled: true },
  { reminder_type: "incomplete_prediction_24hour", hours_before_deadline: 24, enabled: true },
  { reminder_type: "incomplete_prediction_2hour", hours_before_deadline: 2, enabled: true },
];

function shouldUpgradeTemplate(template: EmailTemplate) {
  const body = String(template.body ?? "");
  const subject = String(template.subject ?? "");
  return (
    !body.includes("您好 {{display_name}}") ||
    !body.includes("Hi {{display_name}}") ||
    !subject.includes("/")
  );
}

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
  const outdatedTemplates = fallbackTemplates.filter((fallback) => {
    const dbTemplate = dbTemplates.find((template) => template.type === fallback.type);
    return dbTemplate ? shouldUpgradeTemplate(dbTemplate) : false;
  });

  if (missingTemplates.length || outdatedTemplates.length) {
    await supabase.from("email_templates").upsert([...missingTemplates, ...outdatedTemplates], {
      onConflict: "type",
    });
  }

  const templates = fallbackTemplates.map(
    (fallback) =>
      outdatedTemplates.some((template) => template.type === fallback.type)
        ? fallback
        : dbTemplates.find((template) => template.type === fallback.type) ?? fallback,
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
