"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCopy, RotateCcw, Save } from "lucide-react";
import clsx from "clsx";

type SelfTestStatus = "NOT_TESTED" | "PASS" | "FAIL" | "NEEDS_FIX";

type SelfTestItem = {
  id: string;
  section: string;
  item_name: string;
  instruction: string;
  expected_result: string;
};

type SelfTestResult = {
  id: string;
  section: string;
  item_name: string;
  status: SelfTestStatus;
  note: string;
  tested_by: string;
  tested_at: string;
};

const storageKey = "brainwave_fifa_admin_self_test_results_v1";

const sections: Array<{
  title: string;
  description: string;
  items: SelfTestItem[];
}> = [
  {
    title: "Login and Player Flow",
    description: "Test with real Google/email login and a real new player account.",
    items: [
      {
        id: "new-player-signup",
        section: "Login and Player Flow",
        item_name: "New player can sign up",
        instruction: "Create a new test player account using Google or email login.",
        expected_result: "The player can complete signup successfully and enter the game flow.",
      },
      {
        id: "nickname-save",
        section: "Login and Player Flow",
        item_name: "Nickname can save",
        instruction: "Enter a nickname for the new player and save it.",
        expected_result: "The nickname is saved and shown correctly on player profile, play page, and leaderboard.",
      },
      {
        id: "whatsapp-save",
        section: "Login and Player Flow",
        item_name: "WhatsApp number can save",
        instruction: "Enter a WhatsApp number for the new player and save it.",
        expected_result: "The WhatsApp number is saved correctly for prize notification purpose.",
      },
      {
        id: "blocked-without-login",
        section: "Login and Player Flow",
        item_name: "Player cannot submit without login",
        instruction: "Open the play page in an incognito browser or logged-out state and try to submit a prediction.",
        expected_result: "The system blocks submission and asks the player to login or sign up first.",
      },
      {
        id: "view-own-submission",
        section: "Login and Player Flow",
        item_name: "Player can view own submitted answer",
        instruction: "Login as the test player after submitting an answer.",
        expected_result: "The player can view their own submitted prediction clearly.",
      },
    ],
  },
  {
    title: "Deadline Lock",
    description: "This is a critical test. Confirm that predictions lock correctly based on match deadlines.",
    items: [
      {
        id: "before-due-edit",
        section: "Deadline Lock",
        item_name: "Before due date: player can submit and edit",
        instruction: "Set or use a test match deadline that is still in the future. Login as a player and submit/edit a prediction.",
        expected_result: "The player can submit and edit before the deadline.",
      },
      {
        id: "after-due-block",
        section: "Deadline Lock",
        item_name: "After due date: player cannot submit or edit",
        instruction: "Set or use a test match deadline that has already passed. Try to submit or edit.",
        expected_result: "The system blocks submission and editing after the deadline.",
      },
      {
        id: "game1-lock-deadline",
        section: "Deadline Lock",
        item_name: "Game 1 locks fully after Last 16 first match minus 15 minutes",
        instruction: "Confirm Game 1 deadline is calculated as first Last 16 match kickoff time minus 15 minutes.",
        expected_result: "Game 1 fully locks after the calculated deadline.",
      },
      {
        id: "game2-match-lock",
        section: "Deadline Lock",
        item_name: "Game 2 locks match by match",
        instruction: "Set one Game 2 match deadline as expired and another future match as still open.",
        expected_result: "Only the expired match is locked. Future matches remain open.",
      },
      {
        id: "malaysia-timezone",
        section: "Deadline Lock",
        item_name: "Timezone shows Malaysia time correctly",
        instruction: "Check displayed deadline and match time.",
        expected_result: "Deadline and match time display correctly in Malaysia time.",
      },
    ],
  },
  {
    title: "Team Joining",
    description: "Test referral flow, team size, auto Team 2 creation, and owner score rule.",
    items: [
      {
        id: "team-max-five",
        section: "Team Joining",
        item_name: "Team max 5 people",
        instruction: "Create a team with one owner and add four teammates.",
        expected_result: "The team has exactly 5 people and is marked as full.",
      },
      {
        id: "owner-four-full",
        section: "Team Joining",
        item_name: "Owner + 4 teammates = full",
        instruction: "Check the team member list after four teammates join the owner.",
        expected_result: "The team shows owner + 4 teammates and does not allow more than 5 in the same team.",
      },
      {
        id: "sixth-team-two",
        section: "Team Joining",
        item_name: "6th person using same referral code creates Team 2",
        instruction: "Use the same referral code with a 6th player.",
        expected_result: "The system automatically creates Team 2 for the same owner and adds the 6th player there.",
      },
      {
        id: "owner-team-one-score",
        section: "Team Joining",
        item_name: "Owner personal score only uses Team 1 team points",
        instruction: "Check owner score calculation when the owner has Team 1 and Team 2.",
        expected_result: "The owner personal final score only uses Team 1 team points. Team 2 points do not add to owner individual score.",
      },
      {
        id: "normal-member-one-team",
        section: "Team Joining",
        item_name: "Normal member cannot join two teams",
        instruction: "Try to use another referral code after a normal member already joined a team.",
        expected_result: "The system blocks the player from joining another team.",
      },
      {
        id: "full-team-link-safe",
        section: "Team Joining",
        item_name: "Full team does not break referral link",
        instruction: "Use a referral link from a full Team 1.",
        expected_result: "The referral link still works and places the new member into Team 2.",
      },
    ],
  },
  {
    title: "Admin Safety",
    description: "Confirm admin tools are safe and hidden from normal users.",
    items: [
      {
        id: "admin-update-result",
        section: "Admin Safety",
        item_name: "Admin can update official result",
        instruction: "Login as admin and update a test official result.",
        expected_result: "The official result saves correctly.",
      },
      {
        id: "admin-rerun-score",
        section: "Admin Safety",
        item_name: "Admin can rerun score calculation",
        instruction: "Click rerun score calculation after updating a test result.",
        expected_result: "Scores recalculate successfully.",
      },
      {
        id: "admin-hidden-normal",
        section: "Admin Safety",
        item_name: "Admin buttons are hidden from normal users",
        instruction: "Login as a normal player and check the admin pages/buttons.",
        expected_result: "Normal users cannot see or access admin buttons.",
      },
      {
        id: "simulation-not-public",
        section: "Admin Safety",
        item_name: "Simulation data does not appear in real leaderboard",
        instruction: "Run simulation and then check the public leaderboard.",
        expected_result: "Simulation players and simulation scores do not appear in public leaderboard.",
      },
      {
        id: "clear-sim-safe",
        section: "Admin Safety",
        item_name: "Clear simulation data does not delete real players",
        instruction: "Run Clear Simulation Data.",
        expected_result: "Only simulation data is deleted. Real players remain safe.",
      },
    ],
  },
  {
    title: "Mobile UI",
    description: "Most players will use phone, so the mobile experience must be clear and easy.",
    items: [
      {
        id: "signup-mobile-clean",
        section: "Mobile UI",
        item_name: "Signup page is not messy",
        instruction: "Open signup page on mobile screen size.",
        expected_result: "Signup box, login button, nickname field, and WhatsApp field are clean and easy to use.",
      },
      {
        id: "game1-mobile-submit",
        section: "Mobile UI",
        item_name: "Game 1 pick page is easy to submit",
        instruction: "Open Game 1 play page on mobile screen size and submit a test prediction.",
        expected_result: "Player can pick teams and submit without layout problems.",
      },
      {
        id: "game2-score-mobile",
        section: "Mobile UI",
        item_name: "Game 2 score input is easy to use",
        instruction: "Open Game 2 match card on mobile screen size and enter predicted scores.",
        expected_result: "Score input is easy to tap, enter, edit, and submit.",
      },
      {
        id: "rules-mobile-readable",
        section: "Mobile UI",
        item_name: "Rules page is readable",
        instruction: "Open rules page on mobile screen size.",
        expected_result: "Rules are readable, tables do not overflow, and sections are clear.",
      },
      {
        id: "leaderboard-mobile-clear",
        section: "Mobile UI",
        item_name: "Leaderboard looks clear on mobile",
        instruction: "Open leaderboard on mobile screen size.",
        expected_result: "Player ranking, score, team name, and game tabs are easy to read.",
      },
    ],
  },
];

const statusLabels: Record<SelfTestStatus, string> = {
  NOT_TESTED: "Not Tested",
  PASS: "Pass",
  FAIL: "Fail",
  NEEDS_FIX: "Needs Fix",
};

const statusStyles: Record<SelfTestStatus, string> = {
  NOT_TESTED: "bg-slate-100 text-slate-700",
  PASS: "bg-emerald-100 text-emerald-800",
  FAIL: "bg-red-100 text-red-800",
  NEEDS_FIX: "bg-yellow-100 text-yellow-900",
};

const allItems = sections.flatMap((section) => section.items);

function initialResults(): Record<string, SelfTestResult> {
  const now = new Date().toISOString();
  return Object.fromEntries(
    allItems.map((item) => [
      item.id,
      {
        id: item.id,
        section: item.section,
        item_name: item.item_name,
        status: "NOT_TESTED",
        note: "",
        tested_by: "Admin",
        tested_at: now,
      } satisfies SelfTestResult,
    ]),
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(value));
}

function overallStatus(results: SelfTestResult[]) {
  if (results.some((result) => result.status === "FAIL")) return "NOT READY";
  if (results.some((result) => result.status === "NEEDS_FIX")) return "NEEDS FIX BEFORE LIVE";
  if (results.every((result) => result.status === "PASS")) return "READY FOR SOFT LAUNCH";
  return "TESTING INCOMPLETE";
}

function buildReport(results: SelfTestResult[]) {
  const generatedAt = new Date().toISOString();
  const failed = results.filter((result) => result.status === "FAIL");
  const needsFix = results.filter((result) => result.status === "NEEDS_FIX");
  const notes = results.filter((result) => result.note.trim());

  return [
    "Brainwave Games FIFA Self-Test Report",
    `Generated time: ${formatDate(generatedAt)}`,
    `Overall self-test status: ${overallStatus(results)}`,
    `Total items: ${results.length}`,
    `Passed items: ${results.filter((result) => result.status === "PASS").length}`,
    `Failed items: ${failed.length}`,
    `Needs fix items: ${needsFix.length}`,
    `Not tested items: ${results.filter((result) => result.status === "NOT_TESTED").length}`,
    "",
    "Failed item list:",
    failed.length ? failed.map((result) => `- [${result.section}] ${result.item_name}: ${result.note || "No note"}`).join("\n") : "- None",
    "",
    "Needs fix item list:",
    needsFix.length ? needsFix.map((result) => `- [${result.section}] ${result.item_name}: ${result.note || "No note"}`).join("\n") : "- None",
    "",
    "Notes:",
    notes.length ? notes.map((result) => `- [${result.section}] ${result.item_name}: ${result.note}`).join("\n") : "- None",
  ].join("\n");
}

export function AdminSelfTestChecklist() {
  const [results, setResults] = useState<Record<string, SelfTestResult>>(initialResults);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        setResults({ ...initialResults(), ...(JSON.parse(stored) as Record<string, SelfTestResult>) });
      }
    } catch {
      setResults(initialResults());
    }
  }, []);

  const resultRows = useMemo(() => allItems.map((item) => results[item.id] ?? initialResults()[item.id]), [results]);
  const summary = {
    total: resultRows.length,
    passed: resultRows.filter((result) => result.status === "PASS").length,
    failed: resultRows.filter((result) => result.status === "FAIL").length,
    needsFix: resultRows.filter((result) => result.status === "NEEDS_FIX").length,
    notTested: resultRows.filter((result) => result.status === "NOT_TESTED").length,
  };
  const overall = overallStatus(resultRows);
  const overallTone = overall === "NOT READY"
    ? "bg-red-600 text-white"
    : overall === "NEEDS FIX BEFORE LIVE"
      ? "bg-yellow-400 text-[#071525]"
      : overall === "READY FOR SOFT LAUNCH"
        ? "bg-[#0f8a4b] text-white"
        : "bg-slate-200 text-slate-900";

  function updateResult(id: string, patch: Partial<SelfTestResult>) {
    setResults((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? initialResults()[id]),
        ...patch,
        tested_at: new Date().toISOString(),
      },
    }));
  }

  function saveResults() {
    window.localStorage.setItem(storageKey, JSON.stringify(results));
    setSavedMessage("Self-test result saved on this admin browser.");
    window.setTimeout(() => setSavedMessage(""), 2400);
  }

  function resetChecklist() {
    const next = initialResults();
    setResults(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setSavedMessage("Checklist reset.");
    window.setTimeout(() => setSavedMessage(""), 1800);
  }

  async function copyReport() {
    await navigator.clipboard.writeText(buildReport(resultRows));
    setSavedMessage("Self-test report copied.");
    window.setTimeout(() => setSavedMessage(""), 2200);
  }

  return (
    <div className="grid gap-6">
      <section className="card overflow-hidden">
        <div className="grid gap-4 bg-[#071525] p-5 text-white lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f4c542]">
              Manual Launch Test
            </p>
            <h2 className="mt-2 text-3xl font-black">Self-Test Checklist</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-white/75">
              Use this page to manually test the real live-game flow before
              opening the game to public players.
            </p>
          </div>
          <div className="grid content-start gap-3">
            <div className={clsx("rounded p-4 text-center font-black", overallTone)}>
              {overall}
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-5 lg:grid-cols-2">
              {[
                ["Total", summary.total],
                ["Passed", summary.passed],
                ["Failed", summary.failed],
                ["Needs fix", summary.needsFix],
                ["Not tested", summary.notTested],
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
            onClick={saveResults}
            className="flex h-11 items-center gap-2 rounded bg-[#d71920] px-4 text-sm font-black text-white"
          >
            <Save size={16} />
            Save Self-Test Result
          </button>
          <button
            type="button"
            onClick={resetChecklist}
            className="flex h-11 items-center gap-2 rounded bg-slate-200 px-4 text-sm font-black text-slate-900"
          >
            <RotateCcw size={16} />
            Reset Checklist
          </button>
          <button
            type="button"
            onClick={copyReport}
            className="flex h-11 items-center gap-2 rounded bg-[#071525] px-4 text-sm font-black text-white"
          >
            <ClipboardCopy size={16} />
            Copy Self-Test Report
          </button>
          {savedMessage ? (
            <span className="self-center text-sm font-bold text-[#0f8a4b]">{savedMessage}</span>
          ) : null}
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.title} className="card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8a4b]">
              Self-Test Section
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">{section.title}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">{section.description}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {section.items.map((item) => {
              const result = results[item.id] ?? initialResults()[item.id];
              return (
                <div key={item.id} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[28px_1fr_190px]">
                  <input
                    type="checkbox"
                    checked={result.status === "PASS"}
                    onChange={(event) =>
                      updateResult(item.id, { status: event.target.checked ? "PASS" : "NOT_TESTED" })
                    }
                    className="mt-1 size-5 accent-[#0f8a4b]"
                    aria-label={`Mark ${item.item_name} as pass`}
                  />
                  <div className="grid gap-3">
                    <div>
                      <h4 className="text-lg font-black text-slate-950">{item.item_name}</h4>
                      <p className="mt-1 text-sm font-bold text-slate-500">Instruction</p>
                      <p className="text-sm font-semibold leading-relaxed text-slate-700">{item.instruction}</p>
                      <p className="mt-2 text-sm font-bold text-slate-500">Expected result</p>
                      <p className="text-sm font-semibold leading-relaxed text-slate-700">{item.expected_result}</p>
                    </div>
                    <label className="grid gap-2">
                      <span className="text-sm font-black text-slate-950">Notes</span>
                      <textarea
                        value={result.note}
                        onChange={(event) => updateResult(item.id, { note: event.target.value })}
                        rows={3}
                        placeholder="Add test account, device, issue, or proof note."
                        className="w-full rounded border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#0f8a4b]"
                      />
                    </label>
                    <p className="text-xs font-bold text-slate-400">
                      Last updated: {formatDate(result.tested_at)}
                    </p>
                  </div>
                  <div className="grid content-start gap-2">
                    <label className="text-sm font-black text-slate-950">Status</label>
                    <select
                      value={result.status}
                      onChange={(event) =>
                        updateResult(item.id, { status: event.target.value as SelfTestStatus })
                      }
                      className={clsx(
                        "h-11 rounded border border-slate-200 px-3 text-sm font-black outline-none",
                        statusStyles[result.status],
                      )}
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
