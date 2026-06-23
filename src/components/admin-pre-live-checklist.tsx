"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCopy, RefreshCcw, Search, XCircle } from "lucide-react";
import clsx from "clsx";
import type { PreLiveCheckResult, PreLiveStatus } from "@/lib/admin-pre-live-checklist";

type ChecklistData = {
  generatedAt: string;
  overallStatus: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    notChecked: number;
  };
  sections: Array<{
    title: string;
    checks: PreLiveCheckResult[];
  }>;
  checks: PreLiveCheckResult[];
};

const statusStyles: Record<PreLiveStatus, string> = {
  PASS: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  FAIL: "bg-red-100 text-red-800 ring-red-200",
  WARNING: "bg-yellow-100 text-yellow-900 ring-yellow-200",
  NOT_CHECKED: "bg-slate-100 text-slate-700 ring-slate-200",
};

const statusLabels: Record<PreLiveStatus, string> = {
  PASS: "PASS",
  FAIL: "FAIL",
  WARNING: "WARNING",
  NOT_CHECKED: "NOT CHECKED",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(value));
}

function buildReport(data: ChecklistData) {
  const failed = data.checks.filter((check) => check.status === "FAIL");
  const warnings = data.checks.filter((check) => check.status === "WARNING");
  const suggested = data.checks.filter((check) => check.suggested_fix);

  return [
    "Brainwave Games FIFA Pre-Live Checklist",
    `Generated time: ${formatDate(data.generatedAt)}`,
    `Overall status: ${data.overallStatus}`,
    `Total checks: ${data.summary.total}`,
    `Passed checks: ${data.summary.passed}`,
    `Failed checks: ${data.summary.failed}`,
    `Warning checks: ${data.summary.warnings}`,
    `Not checked checks: ${data.summary.notChecked}`,
    "",
    "Failed item list:",
    failed.length
      ? failed.map((check) => `- [${check.section}] ${check.name}: ${check.explanation}`).join("\n")
      : "- None",
    "",
    "Warning item list:",
    warnings.length
      ? warnings.map((check) => `- [${check.section}] ${check.name}: ${check.explanation}`).join("\n")
      : "- None",
    "",
    "Suggested fixes:",
    suggested.length
      ? suggested.map((check) => `- [${check.section}] ${check.name}: ${check.suggested_fix}`).join("\n")
      : "- None",
  ].join("\n");
}

export function AdminPreLiveChecklist({ data }: { data: ChecklistData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [copyState, setCopyState] = useState("");

  const report = useMemo(() => buildReport(data), [data]);
  const overallTone = data.overallStatus.includes("NOT READY")
    ? "bg-red-600 text-white"
    : data.overallStatus.includes("SOFT")
      ? "bg-[#f4c542] text-[#071525]"
      : "bg-[#0f8a4b] text-white";

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function copyReport() {
    await navigator.clipboard.writeText(report);
    setCopyState("Checklist result copied.");
    window.setTimeout(() => setCopyState(""), 2200);
  }

  function toggle(id: string) {
    setOpenItems((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <div className="grid gap-6">
      <section className="card overflow-hidden">
        <div className="grid gap-4 bg-[#071525] p-5 text-white lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f4c542]">
              Launch Readiness
            </p>
            <h2 className="mt-2 text-3xl font-black">Pre-Live Checklist</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-white/75">
              Use this page to verify login, prediction flow, deadline lock,
              team logic, scoring, leaderboard, and admin safety before opening
              the game to public players.
            </p>
            <p className="mt-3 text-xs font-bold text-white/55">
              Last generated: {formatDate(data.generatedAt)}
            </p>
          </div>
          <div className="grid content-start gap-3">
            <div className={clsx("rounded p-4 text-center font-black", overallTone)}>
              {data.overallStatus}
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-5 lg:grid-cols-2">
              {[
                ["Total", data.summary.total],
                ["Passed", data.summary.passed],
                ["Failed", data.summary.failed],
                ["Warning", data.summary.warnings],
                ["Not checked", data.summary.notChecked],
              ].map(([label, value]) => (
                <div key={label} className="rounded bg-white/10 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-white/55">
                    {label}
                  </p>
                  <p className="mt-1 text-2xl font-black">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-slate-100 p-5">
          <button
            type="button"
            onClick={refresh}
            disabled={isPending}
            className="flex h-11 items-center gap-2 rounded bg-[#d71920] px-4 text-sm font-black text-white disabled:bg-slate-400"
          >
            <CheckCircle2 size={16} />
            Run All Checks
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={isPending}
            className="flex h-11 items-center gap-2 rounded bg-slate-200 px-4 text-sm font-black text-slate-900 disabled:bg-slate-300"
          >
            <RefreshCcw size={16} />
            Refresh Checklist
          </button>
          <button
            type="button"
            onClick={copyReport}
            className="flex h-11 items-center gap-2 rounded bg-[#071525] px-4 text-sm font-black text-white"
          >
            <ClipboardCopy size={16} />
            Copy Checklist Result
          </button>
          {copyState ? (
            <span className="self-center text-sm font-bold text-[#0f8a4b]">{copyState}</span>
          ) : null}
        </div>
      </section>

      {data.sections.map((section) => (
        <section key={section.title} className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8a4b]">
                Checklist Section
              </p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">{section.title}</h3>
            </div>
            <p className="rounded bg-slate-100 px-3 py-2 text-sm font-black text-slate-600">
              {section.checks.length} checks
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {section.checks.map((check) => {
              const isOpen = Boolean(openItems[check.id]);
              return (
                <div key={check.id} className="p-4 sm:p-5">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-black text-slate-950">{check.name}</h4>
                        {check.is_critical ? (
                          <span className="rounded bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                            Critical
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                        {check.explanation}
                      </p>
                      <p className="mt-2 text-xs font-bold text-slate-400">
                        Last checked: {formatDate(check.last_checked_at)}
                      </p>
                    </div>
                    <span
                      className={clsx(
                        "inline-flex w-fit items-center rounded px-3 py-1 text-xs font-black ring-1",
                        statusStyles[check.status],
                      )}
                    >
                      {check.status === "FAIL" ? <XCircle className="mr-1 size-3" /> : null}
                      {statusLabels[check.status]}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(check.id)}
                      className="flex h-10 w-fit items-center gap-2 rounded bg-slate-100 px-3 text-sm font-black text-slate-800 hover:bg-slate-200"
                    >
                      <Search size={15} />
                      Details
                    </button>
                  </div>
                  {isOpen ? (
                    <div className="mt-4 grid gap-3 rounded bg-slate-50 p-4 text-sm">
                      {check.suggested_fix ? (
                        <div>
                          <p className="font-black text-slate-950">Suggested fix</p>
                          <p className="mt-1 font-semibold text-slate-600">{check.suggested_fix}</p>
                        </div>
                      ) : null}
                      <div>
                        <p className="font-black text-slate-950">Details</p>
                        <pre className="mt-2 max-h-56 overflow-auto rounded bg-[#071525] p-3 text-xs leading-relaxed text-white">
                          {JSON.stringify(check.details ?? {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
