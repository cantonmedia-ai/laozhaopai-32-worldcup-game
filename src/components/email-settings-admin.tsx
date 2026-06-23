"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Eye,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import type { EmailSettings, EmailTemplate } from "@/lib/email/types";

type EmailRule = {
  id?: string;
  reminder_type: string;
  hours_before_deadline: number;
  enabled: boolean;
};

type EmailQueueRow = {
  id: string;
  recipient_email: string;
  email_type: string;
  scheduled_for: string;
  status: string;
  attempts: number;
  last_attempt_at: string | null;
  error_message: string | null;
};

type EmailLogRow = {
  id: string;
  recipient_email: string;
  email_type: string;
  subject: string;
  status: string;
  resend_message_id: string | null;
  error_message: string | null;
  created_at: string;
};

type EmailState = {
  settings: EmailSettings;
  templates: EmailTemplate[];
  rules: EmailRule[];
  queue: EmailQueueRow[];
  logs: EmailLogRow[];
  stats: {
    verifiedUsers: number;
    unverifiedUsers: number;
    emailsSentToday: number;
    reminderQueue: number;
    failedEmails: number;
    winnerEmails: number;
  };
};

const emailTypeLabels: Record<string, string> = {
  verify_email: "Email Verification",
  welcome: "Welcome Email",
  incomplete_prediction_3day: "Incomplete Prediction Reminder",
  incomplete_prediction_24hour: "24 Hour Reminder",
  incomplete_prediction_2hour: "2 Hour Reminder",
  new_round_open: "New Round Open Email",
  ranking_update: "Ranking Update Email",
  winner: "Winner Email",
};

const sampleVariables: Record<string, string> = {
  display_name: "球圣 1988",
  game_title: "Brainwave 世界杯竞猜赛",
  round_name: "16强争霸战",
  due_date: "28 Jun 2026, 11:59 PM",
  selected_count: "8",
  required_count: "16",
  ranking: "18",
  points: "85",
};

function fillVariables(value: string | null | undefined) {
  return String(value ?? "").replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    sampleVariables[key] ?? "",
  );
}

function EmailPreview({ template }: { template: EmailTemplate }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="bg-[#071525] p-5 text-white">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f4c542]">
          Brainwave Games
        </p>
        <h3 className="mt-2 text-2xl font-black">
          {fillVariables(template.subject)}
        </h3>
      </div>
      <div className="p-5 text-sm font-semibold leading-6 text-slate-700">
        {fillVariables(template.body)
          .split("\n")
          .map((line, index) => (
            <p key={`${line}-${index}`} className={index ? "mt-2" : ""}>
              {line || "\u00a0"}
            </p>
          ))}
        {template.cta_text ? (
          <div className="mt-5">
            <span className="inline-flex rounded bg-[#d71920] px-4 py-3 font-black text-white">
              {fillVariables(template.cta_text)}
            </span>
          </div>
        ) : null}
      </div>
      <div className="border-t border-slate-200 p-4 text-center text-xs font-semibold text-slate-500">
        © 2026 Brainwave Games
        <br />
        Powered by Brainwave AI
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-black ${
        checked ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"
      }`}
    >
      {checked ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
      {checked ? "Enabled" : "Disabled"}
    </button>
  );
}

export function EmailSettingsAdmin({ initialState }: { initialState: EmailState }) {
  const [state, setState] = useState(initialState);
  const [settings, setSettings] = useState(initialState.settings);
  const [activeTemplateType, setActiveTemplateType] = useState(
    initialState.templates[0]?.type ?? "welcome",
  );
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [manualType, setManualType] = useState("incomplete_prediction_24hour");
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templateLanguage, setTemplateLanguage] = useState<"zh" | "en">("zh");
  const [templatePreviewMode, setTemplatePreviewMode] = useState(false);

  const activeTemplate = useMemo(
    () =>
      state.templates.find((template) => template.type === activeTemplateType) ??
      state.templates[0],
    [activeTemplateType, state.templates],
  );

  async function refresh() {
    const response = await fetch("/api/admin/email-settings");
    const nextState = (await response.json()) as EmailState;
    setState(nextState);
    setSettings(nextState.settings);
  }

  async function saveSettings() {
    setSaving("settings");
    setMessage("");
    try {
      const response = await fetch("/api/admin/email-settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save settings.");
      setMessage("Settings saved.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save settings.");
    } finally {
      setSaving("");
    }
  }

  async function sendTest() {
    setSaving("test");
    setMessage("");
    try {
      const response = await fetch("/api/admin/email-settings/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_email: settings.test_recipient_email }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to send test email.");
      setMessage(payload.result?.ok ? "Test email sent." : payload.result?.error ?? "Test email logged.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send test email.");
    } finally {
      setSaving("");
    }
  }

  async function saveTemplate(template: EmailTemplate) {
    setSaving(`template:${template.type}`);
    setMessage("");
    try {
      const response = await fetch("/api/admin/email-template/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save template.");
      setMessage("Template saved.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save template.");
    } finally {
      setSaving("");
    }
  }

  async function sendPreview(template: EmailTemplate, recipientEmail?: string) {
    setSaving(`preview:${template.type}`);
    setMessage("");
    try {
      const response = await fetch("/api/admin/email-template/send-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          recipient_email: recipientEmail || settings.test_recipient_email,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to send preview.");
      setMessage(payload.result?.ok ? "Test email sent successfully" : payload.result?.error ?? "Preview logged.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send preview.");
    } finally {
      setSaving("");
    }
  }

  async function manualSend() {
    setSaving("manual");
    setMessage("");
    try {
      const response = await fetch("/api/admin/email/manual-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_type: manualType }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to queue emails.");
      setConfirmBulk(false);
      setMessage(`${payload.queued} emails queued.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to queue emails.");
    } finally {
      setSaving("");
    }
  }

  async function queueAction(id: string, action: "retry" | "cancel") {
    setSaving(`${action}:${id}`);
    const response = await fetch(`/api/admin/email/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const payload = await response.json();
    setMessage(response.ok ? `Queue item ${action} updated.` : payload.error);
    await refresh();
    setSaving("");
  }

  function updateTemplate(update: Partial<EmailTemplate>) {
    setState((current) => ({
      ...current,
      templates: current.templates.map((template) =>
        template.type === activeTemplate.type ? { ...template, ...update } : template,
      ),
    }));
  }

  function openTemplateEditor(type: string) {
    setActiveTemplateType(type);
    setTemplateLanguage("zh");
    setTemplatePreviewMode(false);
    setTemplateEditorOpen(true);
  }

  function promptAndSendPreview(template: EmailTemplate) {
    const recipient = window.prompt(
      "Test recipient email",
      settings.test_recipient_email ?? "",
    );
    if (recipient === null) return;
    void sendPreview(template, recipient.trim());
  }

  return (
    <div className="grid gap-6">
      {message ? (
        <div className="rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-6">
        {[
          ["Verified Users", state.stats.verifiedUsers, CheckCircle2],
          ["Unverified Users", state.stats.unverifiedUsers, ShieldAlert],
          ["Emails Sent Today", state.stats.emailsSentToday, Mail],
          ["Reminder Queue", state.stats.reminderQueue, Clock],
          ["Failed Emails", state.stats.failedEmails, ShieldAlert],
          ["Winner Emails", state.stats.winnerEmails, Send],
        ].map(([label, value, Icon]) => {
          const IconComponent = Icon as typeof Mail;
          return (
            <div key={String(label)} className="rounded-lg bg-white p-4 shadow-sm">
              <IconComponent className="text-[#d71920]" size={20} />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                {String(label)}
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">{String(value)}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Sender Settings</h2>
          <div className="mt-4 grid gap-3">
            {[
              ["sender_name", "Sender Name"],
              ["sender_email", "Sender Email"],
              ["reply_to_email", "Reply-To Email"],
              ["test_recipient_email", "Test Recipient Email"],
            ].map(([key, label]) => (
              <label key={key} className="grid gap-1 text-sm font-black text-slate-700">
                {label}
                <input
                  value={String(settings[key as keyof EmailSettings] ?? "")}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="h-11 rounded border border-slate-200 px-3 font-semibold outline-none focus:border-[#d71920]"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={saveSettings}
              disabled={Boolean(saving)}
              className="flex h-11 items-center justify-center gap-2 rounded bg-[#071525] font-black text-white disabled:opacity-60"
            >
              {saving === "settings" ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Settings
            </button>
            <button
              type="button"
              onClick={sendTest}
              disabled={Boolean(saving)}
              className="flex h-11 items-center justify-center gap-2 rounded bg-[#d71920] font-black text-white disabled:opacity-60"
            >
              {saving === "test" ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              Send Test Email
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Email Automation Status</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            When disabled, no reminder, round or winner emails will be sent.
          </p>
          <div className="mt-4">
            <Toggle
              checked={settings.automation_enabled}
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  automation_enabled: !current.automation_enabled,
                }))
              }
            />
          </div>
          <div className="mt-5 grid gap-2">
            {[
              ["send_only_verified", "Send only to verified users"],
              ["send_only_incomplete", "Send only if prediction incomplete"],
              ["do_not_send_after_deadline", "Do not send after deadline"],
              ["do_not_duplicate_timing", "Do not send more than once per timing window"],
              ["do_not_send_unsubscribed", "Do not send to unsubscribed users"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 rounded bg-slate-100 p-3 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(settings[key as keyof EmailSettings])}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Email Types Settings</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {state.templates.map((template) => (
            <div key={template.type} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">
                    {emailTypeLabels[template.type] ?? template.type}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {template.preview_text || "No preview text."}
                  </p>
                </div>
                <Toggle
                  checked={template.enabled}
                  onClick={() => {
                    const next = { ...template, enabled: !template.enabled };
                    setState((current) => ({
                      ...current,
                      templates: current.templates.map((item) =>
                        item.type === template.type ? next : item,
                      ),
                    }));
                    void saveTemplate(next);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => openTemplateEditor(template.type)}
                className="mt-4 h-10 rounded bg-slate-100 px-4 text-sm font-black text-slate-700"
              >
                Edit Template
              </button>
            </div>
          ))}
        </div>
      </section>

      {templateEditorOpen && activeTemplate ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f8a4b]">
                  Email Type
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {emailTypeLabels[activeTemplate.type] ?? activeTemplate.type}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setTemplateEditorOpen(false)}
                className="grid size-10 place-items-center rounded bg-slate-100 text-slate-700"
                aria-label="Close template editor"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5 p-5">
              <div className="flex flex-wrap gap-2">
                {[
                  ["zh", "中文"],
                  ["en", "English"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTemplateLanguage(id as "zh" | "en")}
                    className={`rounded px-4 py-2 text-sm font-black ${
                      templateLanguage === id
                        ? "bg-[#d71920] text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTemplatePreviewMode((current) => !current)}
                  className="ml-auto flex items-center gap-2 rounded bg-slate-100 px-4 py-2 text-sm font-black text-slate-700"
                >
                  <Eye size={16} /> {templatePreviewMode ? "Edit" : "Preview"}
                </button>
              </div>

              {!templatePreviewMode ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm font-black text-slate-700">
                    Email Type
                    <input
                      value={emailTypeLabels[activeTemplate.type] ?? activeTemplate.type}
                      readOnly
                      className="h-11 rounded border border-slate-200 bg-slate-100 px-3"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-slate-700">
                    Subject
                    <input
                      value={activeTemplate.subject}
                      onChange={(event) => updateTemplate({ subject: event.target.value })}
                      className="h-11 rounded border border-slate-200 px-3"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-slate-700 md:col-span-2">
                    Preview Text
                    <input
                      value={activeTemplate.preview_text ?? ""}
                      onChange={(event) => updateTemplate({ preview_text: event.target.value })}
                      className="h-11 rounded border border-slate-200 px-3"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-slate-700 md:col-span-2">
                    Email Body
                    <textarea
                      value={activeTemplate.body}
                      onChange={(event) => updateTemplate({ body: event.target.value })}
                      className="min-h-44 rounded border border-slate-200 p-3"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-slate-700">
                    CTA Button Text
                    <input
                      value={activeTemplate.cta_text ?? ""}
                      onChange={(event) => updateTemplate({ cta_text: event.target.value })}
                      className="h-11 rounded border border-slate-200 px-3"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-slate-700">
                    CTA Button URL
                    <input
                      value={activeTemplate.cta_url ?? ""}
                      onChange={(event) => updateTemplate({ cta_url: event.target.value })}
                      className="h-11 rounded border border-slate-200 px-3"
                    />
                  </label>
                  <p className="rounded bg-slate-100 p-3 text-xs font-bold text-slate-500 md:col-span-2">
                    Variables: {"{{display_name}} {{game_title}} {{round_name}} {{due_date}} {{selected_count}} {{required_count}} {{ranking}} {{points}}"}
                  </p>
                </div>
              ) : (
                <EmailPreview template={activeTemplate} />
              )}

              <div className="grid gap-3 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => saveTemplate(activeTemplate)}
                  disabled={Boolean(saving)}
                  className="flex h-11 items-center justify-center gap-2 rounded bg-[#071525] px-4 font-black text-white disabled:opacity-60"
                >
                  <Save size={17} /> Save Template
                </button>
                <button
                  type="button"
                  onClick={() => setTemplatePreviewMode(true)}
                  className="flex h-11 items-center justify-center gap-2 rounded bg-slate-100 px-4 font-black text-slate-700"
                >
                  <Eye size={17} /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => promptAndSendPreview(activeTemplate)}
                  disabled={Boolean(saving)}
                  className="flex h-11 items-center justify-center gap-2 rounded bg-[#d71920] px-4 font-black text-white disabled:opacity-60"
                >
                  <Send size={17} /> Send Test Email
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateEditorOpen(false)}
                  className="h-11 rounded bg-slate-100 px-4 font-black text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTemplate ? (
        <section className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Email Template Manager</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Variables: {"{{display_name}} {{game_title}} {{round_name}} {{due_date}} {{selected_count}} {{required_count}} {{ranking}} {{points}} {{cta_url}}"}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-black text-slate-700">
              Email Type
              <select
                value={activeTemplateType}
                onChange={(event) => setActiveTemplateType(event.target.value)}
                className="h-11 rounded border border-slate-200 px-3"
              >
                {state.templates.map((template) => (
                  <option key={template.type} value={template.type}>
                    {emailTypeLabels[template.type] ?? template.type}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-black text-slate-700">
              Subject
              <input
                value={activeTemplate.subject}
                onChange={(event) => updateTemplate({ subject: event.target.value })}
                className="h-11 rounded border border-slate-200 px-3"
              />
            </label>
            <label className="grid gap-1 text-sm font-black text-slate-700">
              Preview Text
              <input
                value={activeTemplate.preview_text ?? ""}
                onChange={(event) => updateTemplate({ preview_text: event.target.value })}
                className="h-11 rounded border border-slate-200 px-3"
              />
            </label>
            <label className="grid gap-1 text-sm font-black text-slate-700">
              CTA Button Text
              <input
                value={activeTemplate.cta_text ?? ""}
                onChange={(event) => updateTemplate({ cta_text: event.target.value })}
                className="h-11 rounded border border-slate-200 px-3"
              />
            </label>
            <label className="grid gap-1 text-sm font-black text-slate-700">
              CTA Button URL
              <input
                value={activeTemplate.cta_url ?? ""}
                onChange={(event) => updateTemplate({ cta_url: event.target.value })}
                className="h-11 rounded border border-slate-200 px-3"
              />
            </label>
            <label className="grid gap-1 text-sm font-black text-slate-700 md:col-span-2">
              Email Body
              <textarea
                value={activeTemplate.body}
                onChange={(event) => updateTemplate({ body: event.target.value })}
                className="min-h-36 rounded border border-slate-200 p-3"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => saveTemplate(activeTemplate)}
              disabled={Boolean(saving)}
              className="flex h-11 items-center gap-2 rounded bg-[#071525] px-4 font-black text-white"
            >
              <Save size={18} /> Save Template
            </button>
            <button
              type="button"
              onClick={() => sendPreview(activeTemplate)}
              disabled={Boolean(saving)}
              className="flex h-11 items-center gap-2 rounded bg-[#d71920] px-4 font-black text-white"
            >
              <Send size={18} /> Send Test Preview
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Email Queue Preview</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-2">Scheduled Time</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Recipient</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {state.queue.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="p-2 font-semibold">{new Date(row.scheduled_for).toLocaleString()}</td>
                    <td className="p-2">{row.email_type}</td>
                    <td className="p-2">{row.recipient_email}</td>
                    <td className="p-2 font-bold">{row.status}</td>
                    <td className="flex gap-2 p-2">
                      <button onClick={() => queueAction(row.id, "retry")} className="rounded bg-slate-100 px-2 py-1 font-bold">
                        Retry
                      </button>
                      <button onClick={() => queueAction(row.id, "cancel")} className="rounded bg-red-50 px-2 py-1 font-bold text-red-700">
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
                {state.queue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center font-bold text-slate-500">
                      No queued emails.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Email Logs</h2>
          <div className="mt-4 grid max-h-[460px] gap-2 overflow-y-auto">
            {state.logs.map((log) => (
              <div key={log.id} className="rounded bg-slate-100 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-950">{log.recipient_email}</p>
                  <span className="rounded bg-white px-2 py-1 text-xs font-black">
                    {log.status}
                  </span>
                </div>
                <p className="mt-1 font-semibold text-slate-600">{log.subject}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {log.email_type} · {new Date(log.created_at).toLocaleString()}
                </p>
                {log.error_message ? (
                  <p className="mt-2 text-xs font-bold text-red-700">{log.error_message}</p>
                ) : null}
              </div>
            ))}
            {state.logs.length === 0 ? (
              <p className="rounded bg-slate-100 p-6 text-center font-bold text-slate-500">
                No email logs yet.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Manual Send</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Bulk emails are queued first. In development, emails are redirected to the test recipient.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <select
            value={manualType}
            onChange={(event) => setManualType(event.target.value)}
            className="h-11 rounded border border-slate-200 px-3 font-bold"
          >
            {state.templates.map((template) => (
              <option key={template.type} value={template.type}>
                {emailTypeLabels[template.type] ?? template.type}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setConfirmBulk(true)}
            className="flex h-11 items-center gap-2 rounded bg-[#d71920] px-4 font-black text-white"
          >
            <Send size={18} /> Queue Manual Send
          </button>
          <button
            type="button"
            onClick={refresh}
            className="flex h-11 items-center gap-2 rounded bg-slate-100 px-4 font-black text-slate-700"
          >
            <RefreshCw size={18} /> Refresh
          </button>
        </div>
      </section>

      {confirmBulk ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-950">Confirm Bulk Send</h2>
            <p className="mt-3 font-semibold text-slate-600">
              You are about to queue this email for eligible users. This action cannot be undone.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button onClick={() => setConfirmBulk(false)} className="h-11 rounded bg-slate-100 font-black">
                Cancel
              </button>
              <button onClick={manualSend} className="h-11 rounded bg-[#d71920] font-black text-white">
                Confirm Send
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
