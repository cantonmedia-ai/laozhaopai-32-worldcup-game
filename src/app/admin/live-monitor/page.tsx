import { AdminLayout } from "@/components/admin-layout";
import { LiveMonitorActions } from "@/components/live-monitor-actions";
import {
  liveIssueReport,
  loadLiveMonitorData,
  type LiveMonitorFilters,
} from "@/lib/live-monitor";

export const dynamic = "force-dynamic";

function valueText(value: unknown) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function monitorFilters(params: Record<string, string | string[] | undefined>): LiveMonitorFilters {
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    from: single("from") || undefined,
    to: single("to") || undefined,
    status: single("status") || undefined,
    actionType: single("actionType") || undefined,
    errorType: single("errorType") || undefined,
    area: single("area") || undefined,
    user: single("user") || undefined,
    teamName: single("teamName") || undefined,
    referralCode: single("referralCode") || undefined,
  };
}

function exportHref(filters: LiveMonitorFilters) {
  const search = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  return `/api/admin/live-monitor/export?${search.toString()}`;
}

function summaryCards(summary: Record<string, number | string>) {
  return [
    ["Total players today", summary.totalPlayersToday],
    ["New signups today", summary.newSignupsToday],
    ["Login failures today", summary.loginFailuresToday],
    ["Game 1 submissions today", summary.game1SubmissionsToday],
    ["Game 1 failed submissions today", summary.game1FailedSubmissionsToday],
    ["Game 2 submissions today", summary.game2SubmissionsToday],
    ["Game 2 failed submissions today", summary.game2FailedSubmissionsToday],
    ["Team join attempts today", summary.teamJoinAttemptsToday],
    ["Team join failures today", summary.teamJoinFailuresToday],
    ["Auto-created teams today", summary.autoCreatedTeamsToday],
    ["System errors today", summary.systemErrorsToday],
    ["Last score calculation time", summary.lastScoreCalculationTime],
    ["Last official result update time", summary.lastOfficialResultUpdateTime],
  ];
}

export default async function AdminLiveMonitorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = monitorFilters(params);
  const data = await loadLiveMonitorData(filters);
  const report = liveIssueReport(data);

  const failedSubmissions = data.actions.filter(
    (action) =>
      action.action_type.includes("submit_failed") ||
      action.action_type.includes("blocked_by_deadline"),
  );
  const teamJoinEvents = data.actions.filter(
    (action) => action.action_type.includes("team_") || action.action_type.includes("referral"),
  );
  const deadlineEvents = data.actions.filter((action) =>
    action.action_type.includes("blocked_by_deadline"),
  );

  return (
    <AdminLayout active="/admin/live-monitor">
      <div className="grid gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#0f8a4b]">
              Live Operations
            </p>
            <h1 className="mt-2 text-4xl font-black text-slate-950">Live Monitor</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">
              Monitor player activity, failed actions, system errors, team joining,
              submissions, API status, and scoring health during live game.
            </p>
          </div>
          <LiveMonitorActions report={report} exportHref={exportHref(filters)} />
        </header>

        <form className="grid gap-3 rounded-lg bg-white p-4 shadow-sm md:grid-cols-4">
          <input name="from" type="datetime-local" defaultValue={filters.from} className="h-10 rounded border border-slate-200 px-3 text-sm font-bold" />
          <input name="to" type="datetime-local" defaultValue={filters.to} className="h-10 rounded border border-slate-200 px-3 text-sm font-bold" />
          <select name="status" defaultValue={filters.status ?? ""} className="h-10 rounded border border-slate-200 px-3 text-sm font-bold">
            <option value="">All status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select name="area" defaultValue={filters.area ?? ""} className="h-10 rounded border border-slate-200 px-3 text-sm font-bold">
            <option value="">All areas</option>
            <option value="game1">Game 1</option>
            <option value="game2">Game 2</option>
            <option value="team">Team</option>
            <option value="admin">Admin</option>
          </select>
          <input name="actionType" defaultValue={filters.actionType} placeholder="Action type" className="h-10 rounded border border-slate-200 px-3 text-sm font-bold" />
          <input name="errorType" defaultValue={filters.errorType} placeholder="Error type" className="h-10 rounded border border-slate-200 px-3 text-sm font-bold" />
          <input name="user" defaultValue={filters.user} placeholder="Email or nickname" className="h-10 rounded border border-slate-200 px-3 text-sm font-bold" />
          <input name="referralCode" defaultValue={filters.referralCode} placeholder="Referral code" className="h-10 rounded border border-slate-200 px-3 text-sm font-bold" />
          <button className="h-10 rounded bg-[#d71920] px-4 text-sm font-black text-white md:col-span-4">
            Apply Filters
          </button>
        </form>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards(data.summary).map(([label, value]) => (
            <div key={label} className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">{valueText(value)}</p>
            </div>
          ))}
        </section>

        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Alerts</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.alerts.length ? (
              data.alerts.map((alert) => (
                <span
                  key={`${alert.label}-${alert.message}`}
                  className={`rounded px-3 py-2 text-sm font-black ${
                    alert.level === "critical"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-900"
                  }`}
                >
                  {alert.level.toUpperCase()} · {alert.message}
                </span>
              ))
            ) : (
              <span className="rounded bg-green-100 px-3 py-2 text-sm font-black text-green-800">
                NORMAL · No active warning
              </span>
            )}
          </div>
        </section>

        <MonitorTable
          title="Latest User Actions"
          headers={["Time", "User", "Action", "Status", "Page", "Message"]}
          rows={data.actions.map((action) => [
            new Date(action.created_at).toLocaleString("en-MY"),
            action.user_email ?? action.nickname ?? "-",
            action.action_type,
            action.action_status,
            action.page_path ?? "-",
            action.message ?? "-",
          ])}
        />

        <MonitorTable
          title="Latest System Errors"
          headers={["Time", "User", "Error Type", "Function", "Page", "Message", "Details"]}
          rows={data.errors.map((error) => [
            new Date(error.created_at).toLocaleString("en-MY"),
            error.user_email ?? "-",
            error.error_type,
            error.function_name ?? "-",
            error.page_path ?? "-",
            error.error_message,
            error.error_reference_id,
          ])}
        />

        <MonitorTable
          title="Failed Submission Watch"
          headers={["Time", "User", "Game", "Match", "Error", "Suggested Fix"]}
          rows={failedSubmissions.map((action) => [
            new Date(action.created_at).toLocaleString("en-MY"),
            action.user_email ?? action.nickname ?? "-",
            action.game_key ?? "-",
            action.match_id ?? String(action.metadata?.stageKey ?? "-"),
            action.message ?? "-",
            action.action_type.includes("deadline")
              ? "Check lock time and fixture deadline."
              : "Check prediction RPC and required selections.",
          ])}
        />

        <MonitorTable
          title="Team Join Watch"
          headers={["Time", "User", "Referral Code", "Team", "Status", "Message"]}
          rows={teamJoinEvents.map((action) => [
            new Date(action.created_at).toLocaleString("en-MY"),
            action.user_email ?? action.nickname ?? "-",
            action.referral_code ?? "-",
            action.team_id ?? "-",
            action.action_status,
            action.message ?? "-",
          ])}
        />

        <MonitorTable
          title="Deadline Lock Watch"
          headers={["Time", "User", "Game", "Match", "Deadline", "Action", "Status"]}
          rows={deadlineEvents.map((action) => [
            new Date(action.created_at).toLocaleString("en-MY"),
            action.user_email ?? action.nickname ?? "-",
            action.game_key ?? "-",
            action.match_id ?? String(action.metadata?.stageKey ?? "-"),
            String(action.metadata?.deadline ?? "-"),
            action.action_type,
            action.action_status,
          ])}
        />
      </div>
    </AdminLayout>
  );
}

function MonitorTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: Array<Array<string>>;
}) {
  return (
    <section className="overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={`${title}-${index}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${index}-${cellIndex}`} className="max-w-xs px-4 py-3 font-semibold text-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-4 py-8 text-center font-bold text-slate-500">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
