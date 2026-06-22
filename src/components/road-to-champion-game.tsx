"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Check,
  Clock,
  Loader2,
  Save,
  Send,
  Sparkles,
  Search,
  Trophy,
  X,
} from "lucide-react";
import {
  formatMalaysiaDate,
  roadStageCopy,
  roadStageOrder,
  type RoadStageKey,
} from "@/lib/road-to-champion";

export type RoadTeam = {
  id: string;
  country_name: string | null;
  country_code: string | null;
  flag_url: string | null;
  flag_asset_path: string | null;
};

export type RoadStage = {
  stage_key: RoadStageKey;
  stage_name: string;
  required_selection_count: number;
  points_per_correct: number;
  perfect_bonus_points: number;
  due_at: string;
  status: "draft" | "open" | "locked" | "scored";
};

export type RoadPrediction = {
  stage_key: RoadStageKey;
  selected_team_ids: string[];
  status: "draft" | "submitted" | "locked" | "scored";
  points_earned: number | null;
  correct_count: number | null;
  bonus_earned: number | null;
};

export type RoadSummary = {
  totalPoints: number;
  rank: number | null;
  referralCode: string;
  referralCount: number;
  referralPoints: number;
};

function timeLeft(dueAt: string, now: number) {
  const diff = new Date(dueAt).getTime() - now;
  if (diff <= 0) return "Closed";

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);

  if (days > 0) return `${days} days ${hours} hours`;
  if (hours > 0) return `${hours} hours ${minutes} min`;
  return `${minutes} min`;
}

function visualStatus(stage: RoadStage, now: number) {
  if (stage.status === "scored") return "Scored";
  if (stage.status === "locked" || new Date(stage.due_at).getTime() <= now) {
    return "Locked";
  }
  if (stage.status !== "open") return "Draft";
  return "Open";
}

function flagPath(team: RoadTeam) {
  return team.flag_asset_path || team.flag_url || "";
}

function stageTitle(stage: RoadStage) {
  return roadStageCopy[stage.stage_key].title;
}

export function RoadToChampionGame({
  stages,
  teams,
  predictions,
  summary,
}: {
  stages: RoadStage[];
  teams: RoadTeam[];
  predictions: RoadPrediction[];
  summary: RoadSummary;
}) {
  const [now, setNow] = useState(() => Date.now());
  const initialSelections = useMemo(
    () =>
      Object.fromEntries(
        stages.map((stage) => [
          stage.stage_key,
          predictions.find((item) => item.stage_key === stage.stage_key)
            ?.selected_team_ids ?? [],
        ]),
      ) as Record<RoadStageKey, string[]>,
    [predictions, stages],
  );
  const [selectedByStage, setSelectedByStage] = useState(initialSelections);
  const [activeStageKey, setActiveStageKey] = useState<RoadStageKey>("last_16");
  const [savingStage, setSavingStage] = useState("");
  const [messageByStage, setMessageByStage] = useState<Record<string, string>>({});
  const [confirmStage, setConfirmStage] = useState<RoadStage | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const activeStage =
    stages.find((stage) => stage.stage_key === activeStageKey) ?? stages[0];
  const selected = selectedByStage[activeStage.stage_key] ?? [];
  const selectedTeams = selected
    .map((id) => teams.find((team) => team.id === id))
    .filter(Boolean) as RoadTeam[];
  const required = activeStage.required_selection_count;
  const remaining = Math.max(0, required - selected.length);
  const status = visualStatus(activeStage, now);
  const locked = status !== "Open";
  const complete = selected.length === required;
  const stageMessage = messageByStage[activeStage.stage_key];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTeams = normalizedSearch
    ? teams.filter((team) => {
        const name = team.country_name?.toLowerCase() ?? "";
        const code = team.country_code?.toLowerCase() ?? "";
        return name.includes(normalizedSearch) || code.includes(normalizedSearch);
      })
    : teams;

  function toggle(teamId: string) {
    if (locked) return;

    setMessageByStage((current) => ({
      ...current,
      [activeStage.stage_key]: "",
    }));

    setSelectedByStage((current) => {
      const currentSelected = current[activeStage.stage_key] ?? [];

      if (currentSelected.includes(teamId)) {
        return {
          ...current,
          [activeStage.stage_key]: currentSelected.filter((id) => id !== teamId),
        };
      }

      if (currentSelected.length >= required) return current;

      return {
        ...current,
        [activeStage.stage_key]: [...currentSelected, teamId],
      };
    });
  }

  function save(statusToSave: "draft" | "submitted") {
    setSavingStage(`${activeStage.stage_key}:${statusToSave}`);
    window.setTimeout(() => {
      setSavingStage("");
      setMessageByStage((current) => ({
        ...current,
        [activeStage.stage_key]:
          statusToSave === "draft"
            ? "Draft saved. You can continue later."
            : "Prediction submitted. You can still edit before the deadline.",
      }));
      setConfirmStage(null);
    }, 350);
  }

  const selectedStrip = selectedTeams.length ? (
    <div className="sticky top-[118px] z-10 -mx-4 border-y border-slate-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur lg:static lg:mx-0 lg:border lg:shadow-none">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8a4b]">
          Selected Teams
        </p>
        <p className="text-xs font-black text-slate-500">
          {selected.length} / {required}
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-clean">
        {selectedTeams.map((team) => (
          <button
            key={`strip-${team.id}`}
            type="button"
            onClick={() => toggle(team.id)}
            className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-[#071525] pl-1.5 pr-3 text-xs font-black text-white"
          >
            <span className="grid h-6 w-8 place-items-center overflow-hidden rounded-full bg-white/10">
              {flagPath(team) ? (
                <img
                  src={flagPath(team)}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                team.country_code
              )}
            </span>
            {team.country_code}
            <X size={13} className="text-white/65" />
          </button>
        ))}
      </div>
    </div>
  ) : null;

  const picker = (
    <div className="grid gap-2 pb-28 lg:grid-cols-2 lg:pb-0 xl:grid-cols-3">
      {filteredTeams.map((team) => {
        const selectedTeam = selected.includes(team.id);
        const flag = flagPath(team);

        return (
          <button
            key={`${activeStage.stage_key}-${team.id}`}
            type="button"
            disabled={locked || (!selectedTeam && selected.length >= required)}
            onClick={() => toggle(team.id)}
            className={clsx(
              "group flex min-h-14 items-center gap-3 rounded-lg border bg-white px-3 py-2 text-left shadow-sm transition duration-200 active:scale-[0.99]",
              selectedTeam
                ? "border-[#d6a728] bg-[#fff8df] ring-1 ring-[#d6a728]/35 shadow-[#d6a728]/20"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
              (locked || (!selectedTeam && selected.length >= required)) &&
                "cursor-not-allowed opacity-60",
            )}
          >
            <span className="grid h-9 w-12 shrink-0 place-items-center overflow-hidden rounded bg-slate-100 text-[10px] font-black text-slate-500 sm:h-10 sm:w-14">
              {flag ? (
                <img
                  src={flag}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                team.country_code
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black leading-tight text-slate-950 sm:text-base">
                {team.country_name}
              </span>
              <span className="mt-0.5 block text-xs font-bold uppercase leading-tight text-slate-500">
                {team.country_code}
              </span>
            </span>
            <span
              className={clsx(
                "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-black transition",
                selectedTeam
                  ? "border-[#d6a728] bg-[#f4c542] text-[#071525]"
                  : "border-slate-300 text-slate-400 group-hover:border-slate-400",
              )}
            >
              {selectedTeam ? <Check size={15} /> : null}
            </span>
          </button>
        );
      })}
      {filteredTeams.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-500 lg:col-span-2 xl:col-span-3">
          No countries found. Try another name or code.
        </div>
      ) : null}
    </div>
  );

  const picksPanel = (
    <aside className="rounded-lg border border-white/10 bg-[#071525] p-4 text-white shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f4c542]">
            我的 Sweet 16 预测
          </p>
          <h2 className="mt-1 text-xl font-black">Selected {selected.length} / {required}</h2>
        </div>
        <span
          className={clsx(
            "rounded px-2 py-1 text-xs font-black",
            complete ? "bg-green-100 text-green-800" : "bg-white/10 text-white",
          )}
        >
          {complete ? "Ready" : `${remaining} left`}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-white/70">
        {complete
          ? "已完成 Sweet 16 预测"
          : `还需要选择 ${remaining} 支球队`}
      </p>

      <div className="mt-4 grid max-h-[48vh] gap-2 overflow-y-auto pr-1">
        {Array.from({ length: required }).map((_, index) => {
          const team = selectedTeams[index];
          return team ? (
            <div
              key={team.id}
              className="flex animate-[fadeIn_180ms_ease-out] items-center gap-2 rounded bg-white/10 p-2"
            >
              <span className="grid h-8 w-11 shrink-0 place-items-center overflow-hidden rounded bg-white/10 text-[10px] font-black">
                {flagPath(team) ? (
                  <img
                    src={flagPath(team)}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  team.country_code
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-black">
                {team.country_name}
              </span>
              {!locked ? (
                <button
                  type="button"
                  onClick={() => toggle(team.id)}
                  className="grid size-7 place-items-center rounded bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  aria-label={`Remove ${team.country_name}`}
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          ) : (
            <div
              key={`empty-${index}`}
              className="rounded border border-dashed border-white/15 px-3 py-2 text-sm font-bold text-white/35"
            >
              Slot {index + 1}
            </div>
          );
        })}
      </div>
    </aside>
  );

  return (
    <div className="grid gap-5">
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <section className="overflow-hidden rounded-lg bg-[#071525] text-white shadow-sm">
        <div className="bg-[url('/assets/backgrounds/bg_hero_stadium.png')] bg-cover bg-center p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f4c542]">
                16强争霸战 / Sweet 16
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Pick 16 teams and keep your picks visible.
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded bg-green-100 px-3 py-1 text-green-800">
                {status}
              </span>
              <span className="rounded bg-[#f4c542] px-3 py-1 text-[#071525]">
                Selected {selected.length} / {required}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-4">
          <div className="rounded bg-white/10 p-4">
            <p className="text-sm font-bold text-white/65">Due Date</p>
            <p className="mt-1 text-lg font-black">
              {formatMalaysiaDate(activeStage.due_at)}
            </p>
          </div>
          <div className="rounded bg-white/10 p-4">
            <p className="text-sm font-bold text-white/65">Closes in</p>
            <p className="mt-1 text-lg font-black">
              {timeLeft(activeStage.due_at, now)}
            </p>
          </div>
          <div className="rounded bg-white/10 p-4">
            <p className="text-sm font-bold text-white/65">Points Rule</p>
            <p className="mt-1 text-lg font-black">
              +{activeStage.points_per_correct} each
            </p>
          </div>
          <div className="rounded bg-white/10 p-4">
            <p className="text-sm font-bold text-white/65">My Points</p>
            <p className="mt-1 text-lg font-black">{summary.totalPoints}</p>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 overflow-x-auto rounded-lg bg-white p-3 shadow-sm">
        {roadStageOrder.map((stageKey) => {
          const stage = stages.find((item) => item.stage_key === stageKey);
          if (!stage) return null;
          return (
            <button
              key={stageKey}
              type="button"
              onClick={() => setActiveStageKey(stageKey)}
              className={clsx(
                "shrink-0 rounded px-3 py-2 text-xs font-black",
                activeStageKey === stageKey
                  ? "bg-[#d71920] text-white"
                  : "bg-slate-100 text-slate-700",
              )}
            >
              {roadStageCopy[stageKey].shortName}
            </button>
          );
        })}
      </div>

      <div className="sticky top-14 z-20 lg:hidden">
        <details className="rounded-lg border border-slate-200 bg-white shadow-lg">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
            <span className="font-black text-slate-950">我的 Sweet 16 预测</span>
            <span className="rounded bg-[#f4c542] px-2 py-1 text-xs font-black text-[#071525]">
              Selected {selected.length} / {required}
            </span>
          </summary>
          <div className="border-t border-slate-100 p-3">{picksPanel}</div>
        </details>
      </div>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f8a4b]">
                Available Teams
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                {stageTitle(activeStage).split("\n").map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Select exactly {required} teams. Tap selected teams again to remove.
              </p>
            </div>
            <div className="rounded bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
              {filteredTeams.length} / {teams.length} countries
            </div>
          </div>

          <label className="mb-3 flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-500">
            <Search size={17} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search country or code"
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="grid size-7 place-items-center rounded-full bg-slate-200 text-slate-600"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            ) : null}
          </label>

          {stageMessage ? (
            <p className="mb-4 rounded bg-yellow-50 p-3 text-sm font-bold text-yellow-900">
              {stageMessage}
            </p>
          ) : null}

          {selectedStrip}
          {picker}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-20 grid gap-3">
            {picksPanel}
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <button
                type="button"
                disabled={Boolean(savingStage)}
                onClick={() => save("draft")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded bg-slate-100 px-4 font-black text-slate-800 disabled:opacity-60"
              >
                {savingStage === `${activeStage.stage_key}:draft` ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                {selected.length === 0
                  ? "Save Draft"
                  : `Save Draft (${selected.length} selected)`}
              </button>
              <p className="mt-2 text-center text-xs font-semibold text-slate-500">
                Save your picks and continue later.
              </p>
              <button
                type="button"
                disabled={!complete || Boolean(savingStage)}
                onClick={() => setConfirmStage(activeStage)}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded bg-[#d71920] px-4 font-black text-white disabled:bg-slate-300 disabled:text-slate-500"
              >
                <Send size={18} />
                {complete
                  ? "Submit Sweet 16 Prediction"
                  : `Select ${remaining} more to submit`}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-2xl lg:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2">
          <button
            type="button"
            disabled={Boolean(savingStage)}
            onClick={() => save("draft")}
            className="flex h-12 items-center justify-center gap-2 rounded bg-slate-100 px-3 text-sm font-black text-slate-800 disabled:opacity-60"
          >
            <Save size={16} />
            {selected.length === 0 ? "Save Draft" : `Draft (${selected.length})`}
          </button>
          <button
            type="button"
            disabled={!complete || Boolean(savingStage)}
            onClick={() => setConfirmStage(activeStage)}
            className="flex h-12 items-center justify-center gap-2 rounded bg-[#d71920] px-3 text-sm font-black text-white disabled:bg-slate-300 disabled:text-slate-500"
          >
            {complete ? "Submit" : `${remaining} more`}
          </button>
        </div>
        <p className="mt-1 text-center text-xs font-semibold text-slate-500">
          Save your picks and continue later.
        </p>
      </div>

      {confirmStage ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#f4c542] text-[#071525]">
              <Sparkles size={24} />
            </div>
            <h2 className="mt-4 text-center text-2xl font-black text-slate-950">
              Confirm Submission?
            </h2>
            <p className="mt-3 text-center font-semibold text-slate-600">
              You selected {required} teams for Sweet 16. You can still edit
              before the deadline.
            </p>
            <div className="mt-4 grid gap-2 rounded bg-slate-100 p-3 text-sm font-bold text-slate-600">
              <p>Due date: 28 Jun 2026, 11:59 pm</p>
              <p className="flex items-center gap-2">
                <Clock size={15} /> {timeLeft(confirmStage.due_at, now)}
              </p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setConfirmStage(null)}
                className="h-11 rounded bg-slate-100 px-4 font-black text-slate-700"
              >
                Review Picks
              </button>
              <button
                type="button"
                onClick={() => save("submitted")}
                className="flex h-11 items-center justify-center gap-2 rounded bg-[#d71920] px-4 font-black text-white"
              >
                {savingStage === `${activeStage.stage_key}:submitted` ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Trophy size={18} />
                )}
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
