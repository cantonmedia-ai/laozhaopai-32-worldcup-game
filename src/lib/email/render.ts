import type { EmailTemplate, EmailVariables } from "@/lib/email/types";
import { normalizeLanguage, type Language } from "@/i18n";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://games.brainwaveai.my";
const defaultGameUrl = "https://games.brainwaveai.my/fifa-last-32";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderText(value: string | null | undefined, variables: EmailVariables) {
  if (!value) return "";

  return value.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(variables[key] ?? ""),
  );
}

export function absoluteUrl(pathOrUrl: string | null | undefined) {
  if (!pathOrUrl) return defaultGameUrl;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return new URL(pathOrUrl, siteUrl).toString();
}

function splitDualLanguage(value: string) {
  const normalized = value.replace(/\r\n/g, "\n");
  const markers = ["\n\nHello ", "\n\nHi "];
  const marker = markers.find((item) => normalized.includes(item));
  if (!marker) return { zh: normalized, en: "" };

  const index = normalized.indexOf(marker);
  return {
    zh: normalized.slice(0, index).trim(),
    en: normalized.slice(index).trim(),
  };
}

function orderDualLanguage(value: string, language: Language) {
  const parts = splitDualLanguage(value);
  if (!parts.en) return value;
  return language === "en"
    ? `${parts.en}\n\n${parts.zh}`
    : `${parts.zh}\n\n${parts.en}`;
}

function splitSlashText(value: string) {
  const parts = value.split("/").map((item) => item.trim()).filter(Boolean);
  if (parts.length < 2) return { zh: value, en: "" };
  return { zh: parts[0], en: parts.slice(1).join(" / ") };
}

function orderedSlashText(value: string, language: Language) {
  const parts = splitSlashText(value);
  if (!parts.en) return value;
  return language === "en" ? `${parts.en} / ${parts.zh}` : `${parts.zh} / ${parts.en}`;
}

function preferredLanguage(variables: EmailVariables) {
  return normalizeLanguage(String(variables.preferred_language ?? "zh"));
}

function bodyToHtml(body: string) {
  return body
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      const lines = trimmed.split("\n");
      const isList = lines.every((line) => /^[-•]\s+/.test(line.trim()));
      if (isList) {
        return `<ul style="margin:12px 0 0;padding-left:20px;color:#d7deea;">${lines
          .map((line) => `<li style="margin:6px 0;">${escapeHtml(line.replace(/^[-•]\s+/, ""))}</li>`)
          .join("")}</ul>`;
      }

      return `<p style="margin:0 0 14px;color:#d7deea;font-size:16px;line-height:1.7;">${lines
        .map((line) => escapeHtml(line))
        .join("<br />")}</p>`;
    })
    .join("");
}

export function renderEmailPlainText(
  template: EmailTemplate,
  variables: EmailVariables,
) {
  const language = preferredLanguage(variables);
  const subject = orderedSlashText(renderText(template.subject, variables), language);
  const body = orderDualLanguage(renderText(template.body, variables), language);
  const ctaText = orderedSlashText(renderText(template.cta_text, variables), language) || "Play Now";
  const ctaUrl = absoluteUrl(renderText(template.cta_url, variables) || defaultGameUrl);

  return [
    "Brainwave Games",
    subject,
    "",
    body,
    "",
    `${ctaText}: ${ctaUrl}`,
    "",
    "© 2026 Brainwave Games",
    "Powered by Brainwave AI",
  ].join("\n");
}

export function renderEmailHtml(template: EmailTemplate, variables: EmailVariables) {
  const language = preferredLanguage(variables);
  const preview = escapeHtml(
    orderedSlashText(renderText(template.preview_text, variables), language),
  );
  const subject = escapeHtml(orderedSlashText(renderText(template.subject, variables), language));
  const body = bodyToHtml(orderDualLanguage(renderText(template.body, variables), language));
  const ctaText = escapeHtml(
    orderedSlashText(renderText(template.cta_text, variables), language) ||
      "立即进入游戏 / Play Now",
  );
  const ctaUrl = absoluteUrl(renderText(template.cta_url, variables) || defaultGameUrl);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#030712;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#ffffff;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#030712;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#071525;border:1px solid #1f3148;border-radius:20px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.45);">
            <tr>
              <td style="padding:28px 26px 18px;background:#071525;">
                <div style="font-size:12px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:#f4c542;">Brainwave Games</div>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.18;font-weight:900;color:#ffffff;">${subject}</h1>
                <div style="height:3px;width:72px;margin-top:18px;background:linear-gradient(90deg,#f4c542,#ffe7a0,#d6a728);border-radius:999px;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 18px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1b2d;border:1px solid #223750;border-radius:16px;">
                  <tr>
                    <td style="padding:24px 22px;">
                      ${body}
                      <div style="padding-top:12px;">
                        <a href="${escapeHtml(ctaUrl)}" style="display:block;text-align:center;background:linear-gradient(135deg,#f4c542 0%,#ffe08a 52%,#d6a728 100%);color:#071525;text-decoration:none;font-size:16px;font-weight:900;line-height:1.2;padding:16px 18px;border-radius:12px;box-shadow:0 12px 28px rgba(244,197,66,0.24);">
                          ${ctaText}
                        </a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 26px;text-align:center;color:#8fa0b6;font-size:12px;line-height:1.7;">
                <div style="margin-bottom:6px;color:#f4c542;font-weight:700;">World Cup Prediction Campaign</div>
                © 2026 Brainwave Games<br />
                Powered by Brainwave AI
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
