"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Loader2, MessageCircle, Save, Send, Trophy, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

function flagPath(team: RoadTeam) {
  return team.flag_asset_path || team.flag_url || "";
}

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
  if (new Date(stage.due_at).getTime() - now <= 86_400_000) return "Closing Soon";
  return "Open";
}

function nextClosingStage(stages: RoadStage[], now: number) {
  return stages.find(
    (stage) =>
      stage.status === "open" && new Date(stage.due_at).getTime() > now,
  );
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
  const [savingStage, setSavingStage] = useState("");
  const [messageByStage, setMessageByStage] = useState<Record<string, string>>({});

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const nextStage = nextClosingStage(stages, now);
  const referralLink = `https://games.brainwaveai.my/fifa?ref=${encodeURIComponent(summary.referralCode)}`;

  function toggle(stage: RoadStage, teamId: string) {
    if (visualStatus(stage, now) !== "Open" && visualStatus(stage, now) !== "Closing Soon") {
      return;
    }

    setMessageByStage((current) => ({ ...current, [stage.stage_key]: "" }));
    setSelectedByStage((current) => {
      const selected = current[stage.stage_key] ?? [];
      if (selected.includes(teamId)) {
        return {
          ...current,
          [stage.stage_key]: selected.filter((id) => id !== teamId),
        };
      }
      if (selected.length >= stage.required_selection_count) {
        return current;
      }
      return {
        ...current,
        [stage.stage_key]: [...selected, teamId],
      };
    });
  }

  async function save(stage: RoadStage, status: "draft" | "submitted") {
    const selected = selectedByStage[stage.stage_key] ?? [];
    setSavingStage(`${stage.stage_key}:${status}`);
    setMessageByStage((current) => ({ ...current, [stage.stage_key]: "" }));

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("save_road_prediction", {
        p_stage_key: stage.stage_key,
        p_team_ids: selected,
        p_status: status,
      });

      if (error) throw new Error(error.message);

      setMessageByStage((current) => ({
        ...current,
        [stage.stage_key]:
          status === "draft"
            ? "Draft saved. You can still edit before the due date."
            : "Prediction submitted. You can still edit before the due date.",
      }));
    } catch (error) {
      setMessageByStage((current) => ({
        ...current,
        [stage.stage_key]:
          error instanceof Error ? error.message : "Unable to save prediction.",
      }));
    } finally {
      setSavingStage("");
    }
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-lg bg-[#071525] text-white shadow-sm">
        <div className="bg-[url('/assets/backgrounds/bg_hero_stadium.png')] bg-cover bg-center p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f4c542]">
            Road to Champion
          </p>
          <h2 className="mt-2 text-2xl font-black">
            {nextStage
              ? `Next deadline: ${roadStageCopy[nextStage.stage_key].shortName} Prediction closes on ${formatMalaysiaDate(nextStage.due_at)}`
              : "All open deadlines are closed for now."}
          </h2>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-4">
          <div className="rounded bg-white/10 p-4">
            <p className="text-sm font-bold text-white/65">Current Points</p>
            <p className="mt-1 text-3xl font-black">{summary.totalPoints}</p>
          </div>
          <div className="rounded bg-white/10 p-4">
            <p className="text-sm font-bold text-white/65">Ranking</p>
            <p className="mt-1 text-3xl font-black">
              {summary.rank ? `#${summary.rank}` : "-"}
            </p>
          </div>
          <div className="rounded bg-white/10 p-4">
            <p className="text-sm font-bold text-white/65">Next Closing</p>
            <p className="mt-1 text-xl font-black">
              {nextStage ? roadStageCopy[nextStage.stage_key].shortName : "-"}
            </p>
            <p className="text-sm text-white/70">
              {nextStage ? timeLeft(nextStage.due_at, now) : "No open stage"}
            </p>
          </div>
          <Link
            href="/referral"
            className="flex items-center justify-center gap-2 rounded bg-[#f4c542] p-4 text-center font-black text-[#071525]"
          >
            <UsersRound size={18} /> Referral Link
          </Link>
        </div>
      </section>

      <div className="flex items-center gap-2 overflow-x-auto rounded-lg bg-white p-3 shadow-sm">
        {roadStageOrder.map((stageKey, index) => (
          <div key={stageKey} className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
              {roadStageCopy[stageKey].shortName}
            </span>
            {index < roadStageOrder.length - 1 ? (
              <span className="text-sm font-black text-[#d71920]">-&gt;</span>
            ) : null}
          </div>
        ))}
      </div>

      {stages.map((stage) => {
        const selected = selectedByStage[stage.stage_key] ?? [];
        const prediction = predictions.find(
          (item) => item.stage_key === stage.stage_key,
        );
        const status = visualStatus(stage, now);
        const locked = status === "Locked" || status === "Scored" || status === "Draft";
        const complete = selected.length === stage.required_selection_count;
        const stageMessage = messageByStage[stage.stage_key];

        return (
          <section key={stage.stage_key} className="card overflow-hidden">
            <div className="grid gap-4 border-b border-slate-100 p-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={clsx(
                      "rounded px-3 py-1 text-xs font-black",
                      status === "Open" && "bg-green-100 text-green-800",
                      status === "Closing Soon" && "bg-yellow-100 text-yellow-900",
                      status === "Locked" && "bg-slate-200 text-slate-700",
                      status === "Scored" && "bg-[#071525] text-white",
                      status === "Draft" && "bg-slate-100 text-slate-500",
                    )}
                  >
                    {status}
                  </span>
                  <span className="rounded bg-red-50 px-3 py-1 text-xs font-black text-[#d71920]">
                    Selected {selected.length} / {stage.required_selection_count}
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-black text-slate-950">
                  {roadStageCopy[stage.stage_key].title}
                </h2>
                <p className="mt-1 font-semibold text-slate-600">
                  {roadStageCopy[stage.stage_key].body}
                </p>
                <div className="mt-3 grid gap-1 text-sm font-bold text-slate-600">
                  <p>Due Date: {formatMalaysiaDate(stage.due_at)}</p>
                  <p>Closes in: {timeLeft(stage.due_at, now)}</p>
                  <p>
                    Points: +{stage.points_per_correct} each
                    {stage.perfect_bonus_points
                      ? `, perfect bonus +${stage.perfect_bonus_points}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:w-56 lg:grid-cols-1">
                {!locked ? (
                  <>
                    <button
                      type="button"
                      disabled={Boolean(savingStage)}
                      onClick={() => save(stage, "draft")}
                      className="flex h-11 items-center justify-center gap-2 rounded bg-slate-100 px-4 font-black text-slate-800 disabled:opacity-60"
                    >
                      {savingStage === `${stage.stage_key}:draft` ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Save size={18} />
                      )}
                      Save Draft
                    </button>
                    <button
                      type="button"
                      disabled={!complete || Boolean(savingStage)}
                      onClick={() => save(stage, "submitted")}
                      className="flex h-11 items-center justify-center gap-2 rounded bg-[#d71920] px-4 font-black text-white disabled:bg-slate-400"
                    >
                      {savingStage === `${stage.stage_key}:submitted` ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Send size={18} />
                      )}
                      Submit
                    </button>
                  </>
                ) : (
                  <div className="rounded bg-slate-100 p-3 text-sm font-bold text-slate-700">
                    {status === "Scored" && prediction
                      ? `You got ${prediction.correct_count ?? 0} correct and earned ${prediction.points_earned ?? 0} points.`
                      : "This prediction is locked. Result will be updated after admin confirms the official teams."}
                  </div>
                )}
              </div>
            </div>

            {stageMessage ? (
              <p className="mx-5 mt-4 rounded bg-yellow-50 p-3 text-sm font-bold text-yellow-900">
                {stageMessage}
              </p>
            ) : null}

            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {teams.map((team) => {
                const selectedTeam = selected.includes(team.id);
                const flag = flagPath(team);

                return (
                  <button
                    key={`${stage.stage_key}-${team.id}`}
                    type="button"
                    disabled={locked}
                    onClick={() => toggle(stage, team.id)}
                    className={clsx(
                      "rounded-lg border p-3 text-left shadow-sm transition",
                      selectedTeam
                        ? "border-[#0f8a4b] bg-green-50 ring-2 ring-[#0f8a4b]/20"
                        : "border-slate-200 bg-white hover:border-slate-300",
                      locked && "cursor-not-allowed opacity-75",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded bg-slate-100 text-xs font-black text-slate-500">
                        {flag ? (
                          <Image
                            src={flag}
                            alt=""
                            width={64}
                            height={42}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          team.country_code
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-black text-slate-950">
                          {team.country_name}
                        </span>
                        <span className="text-sm font-semibold text-slate-500">
                          {team.country_code}
                        </span>
                      </span>
                    </div>
                    <span
                      className={clsx(
                        "mt-3 inline-flex rounded px-3 py-1 text-xs font-black",
                        selectedTeam
                          ? "bg-[#0f8a4b] text-white"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {selectedTeam ? "Selected" : "Tap to select"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="grid gap-4 rounded-lg bg-white p-5 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="flex items-center gap-2 text-[#0f8a4b]">
            <Trophy size={18} />
            <p className="text-sm font-black uppercase tracking-[0.18em]">
              Referral Bonus
            </p>
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            Invite friends and earn referral points
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {summary.referralCount} successful referrals. Referral points earned:
            {" "}
            <span className="font-black text-[#d71920]">{summary.referralPoints}</span>
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(referralLink)}
            className="h-11 rounded bg-[#071525] px-4 font-black text-white"
          >
            Copy Link
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Join my Road to Champion game: ${referralLink}`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center justify-center gap-2 rounded bg-[#0f8a4b] px-4 font-black text-white"
          >
            <MessageCircle size={18} /> WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
