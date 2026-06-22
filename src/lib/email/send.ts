import { renderEmailHtml, renderText } from "@/lib/email/render";
import type { EmailSettings, EmailTemplate, EmailVariables } from "@/lib/email/types";

type SendEmailInput = {
  to: string;
  template: EmailTemplate;
  settings: EmailSettings;
  variables?: EmailVariables;
};

export function senderAddress(settings: Pick<EmailSettings, "sender_name" | "sender_email">) {
  return `${settings.sender_name} <${settings.sender_email}>`;
}

export async function sendEmail({ to, template, settings, variables = {} }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const testRecipient = process.env.TEST_EMAIL_RECIPIENT || settings.test_recipient_email;
  const safetyMode = process.env.NODE_ENV !== "production";
  const finalTo = safetyMode && testRecipient ? testRecipient : to;
  const subject = renderText(template.subject, variables);

  if (!apiKey) {
    return {
      ok: false,
      skipped: true,
      to: finalTo,
      originalTo: to,
      subject,
      messageId: null,
      error: "RESEND_API_KEY is not configured.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: senderAddress(settings),
      to: [finalTo],
      reply_to: settings.reply_to_email,
      subject,
      html: renderEmailHtml(template, variables),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    error?: string;
  };

  if (!response.ok) {
    return {
      ok: false,
      skipped: false,
      to: finalTo,
      originalTo: to,
      subject,
      messageId: null,
      error: payload.message || payload.error || "Resend email failed.",
    };
  }

  return {
    ok: true,
    skipped: false,
    to: finalTo,
    originalTo: to,
    subject,
    messageId: payload.id ?? null,
    error: null,
  };
}
