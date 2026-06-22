import type { EmailTemplate, EmailVariables } from "@/lib/email/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://games.brainwaveai.my";

export function renderText(value: string | null | undefined, variables: EmailVariables) {
  if (!value) return "";

  return value.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(variables[key] ?? ""),
  );
}

export function absoluteUrl(pathOrUrl: string | null | undefined) {
  if (!pathOrUrl) return siteUrl;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return new URL(pathOrUrl, siteUrl).toString();
}

export function renderEmailHtml(template: EmailTemplate, variables: EmailVariables) {
  const preview = renderText(template.preview_text, variables);
  const body = renderText(template.body, variables).replace(/\n/g, "<br />");
  const ctaText = renderText(template.cta_text, variables);
  const ctaUrl = absoluteUrl(renderText(template.cta_url, variables));

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;">${preview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#071525;color:#ffffff;padding:22px 24px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#f4c542;">Brainwave Games</div>
                <h1 style="margin:8px 0 0;font-size:26px;line-height:1.15;">${renderText(template.subject, variables)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;font-size:16px;line-height:1.6;color:#334155;">
                ${body}
                ${
                  ctaText
                    ? `<div style="margin-top:24px;"><a href="${ctaUrl}" style="display:inline-block;background:#d71920;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:8px;">${ctaText}</a></div>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;">
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
