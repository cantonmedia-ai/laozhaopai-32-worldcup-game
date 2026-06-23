"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Copy, Loader2, Send, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { countdownLabel } from "@/lib/knockout-winner";
import { stageDescription, stageDisplayName } from "@/lib/stage-labels";

export type KnockoutTeam = {
  id: string;
  country_name: string | null;
  country_code: string | null;
  flag_url: string | null;
  flag_asset_path: string | null;
};

export type KnockoutMatch = {
  id: string;
  round_key: string;
  round_name: string;
  match_number: number;
  match_start_at: string;
  prediction_lock_at: string;
  team_a_score: number | null;
  team_b_score: number | null;
  actual_winner_team_id: string | null;
  status: "draft" | "open" | "locked" | "scored" | "completed";
  team_a: KnockoutTeam;
  team_b: KnockoutTeam;
};

export type KnockoutPrediction = {
  match_id: string;
  selected_winner_team_id: string;
  predicted_team_a_score: number | null;
  predicted_team_b_score: number | null;
  individual_match_score: number | null;
  team_accumulated_score: number | null;
  final_earned_score: number | null;
  points_earned: number | null;
  is_correct: boolean | null;
  status: "submitted" | "locked" | "scored";
};

type TeamContext = {
  id: string;
  team_name: string;
  team_code: string;
  role: string;
  members: Array<{ nickname: string; role: string }>;
  total_points: number;
  active_member_count: number;
  average_score: number;
  ranking_position: number | null;
  personal_contribution: number;
} | null;

function flagPath(team: KnockoutTeam) {
  return team.flag_asset_path || team.flag_url || "";
}

function statusLabel(match: KnockoutMatch, now: number) {
  if (match.status === "completed" || match.status === "scored") return "Scored";
  if (match.status === "locked" || now >= new Date(match.prediction_lock_at).getTime()) {
    return "Locked";
  }
  if (
    match.status === "open" &&
    new Date(match.prediction_lock_at).getTime() - now <= 86_400_000
  ) {
    return "Closing Soon";
  }
  if (match.status === "open" || match.status === "draft") return "Open";
  return "Locked";
}

const knockoutRoundOrder = ["last_32", "last_16", "last_8", "last_4", "final"] as const;

type KnockoutRoundKey = (typeof knockoutRoundOrder)[number];

const knockoutRoundSlots: Record<KnockoutRoundKey, number> = {
  last_32: 16,
  last_16: 8,
  last_8: 4,
  last_4: 2,
  final: 1,
};

const knockoutWaitingText: Record<KnockoutRoundKey, string> = {
  last_32: "Round of 32 fixtures will appear once official knockout matches are published.",
  last_16: "Sweet 16 opens after Round of 32 winners are confirmed.",
  last_8: "Elite 8 opens after Sweet 16 winners are confirmed.",
  last_4: "Final 4 opens after Elite 8 winners are confirmed.",
  final: "Grand Final opens after Final 4 winners are confirmed.",
};

function normalizeRoundKey(value?: string | null): KnockoutRoundKey {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("16")) return "last_16";
  if (normalized.includes("8") || normalized.includes("quarter")) return "last_8";
  if (normalized.includes("4") || normalized.includes("semi")) return "last_4";
  if (normalized.includes("final")) return "final";
  return "last_32";
}

export function KnockoutDbGame({
  mode,
  matches,
  predictions,
  totalPoints,
  ranking,
  teamContext,
}: {
  mode: "solo" | "team";
  matches: KnockoutMatch[];
  predictions: KnockoutPrediction[];
  totalPoints: number;
  ranking: number | null;
  teamContext?: TeamContext;
}) {
  const [selectedByMatch, setSelectedByMatch] = useState<Record<string, string>>(
    Object.fromEntries(
      predictions.map((prediction) => [
        prediction.match_id,
        prediction.selected_winner_team_id,
      ]),
    ),
  );
  const [scoreByMatch, setScoreByMatch] = useState<
    Record<string, { teamA: string; teamB: string }>
  >(
    Object.fromEntries(
      predictions.map((prediction) => [
        prediction.match_id,
        {
          teamA:
            typeof prediction.predicted_team_a_score === "number"
              ? String(prediction.predicted_team_a_score)
              : "",
          teamB:
            typeof prediction.predicted_team_b_score === "number"
              ? String(prediction.predicted_team_b_score)
              : "",
        },
      ]),
    ),
  );
  const [message, setMessage] = useState("");
  const [savingMatch, setSavingMatch] = useState("");
  const [now, setNow] = useState(0);
  const [activeRoundKey, setActiveRoundKey] = useState<KnockoutRoundKey>(
    normalizeRoundKey(matches[0]?.round_key),
  );

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    const firstUpdate = window.setTimeout(updateNow, 0);
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearTimeout(firstUpdate);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!matches.length) return;
    setActiveRoundKey(normalizeRoundKey(matches[0].round_key));
  }, [matches]);

  const predictionByMatch = useMemo(
    () => Object.fromEntries(predictions.map((item) => [item.match_id, item])),
    [predictions],
  );

  const matchesByRound = useMemo(() => {
    const grouped = Object.fromEntries(
      knockoutRoundOrder.map((roundKey) => [roundKey, [] as KnockoutMatch[]]),
    ) as Record<KnockoutRoundKey, KnockoutMatch[]>;

    for (const match of matches) {
      grouped[normalizeRoundKey(match.round_key)].push(match);
    }

    return grouped;
  }, [matches]);
  const activeMatches = matchesByRound[activeRoundKey] ?? [];
  const activeRound = stageDisplayName(activeRoundKey);
  const nextDue = matches
    .filter((match) => new Date(match.prediction_lock_at).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.prediction_lock_at).getTime() -
        new Date(b.prediction_lock_at).getTime(),
    )[0];

  async function save(match: KnockoutMatch) {
    const winnerId = selectedByMatch[match.id];
    const score = scoreByMatch[match.id] ?? { teamA: "", teamB: "" };
    const teamAScore = Number(score.teamA);
    const teamBScore = Number(score.teamB);
    if (!winnerId || savingMatch) return;
    if (
      score.teamA.trim() === "" ||
      score.teamB.trim() === "" ||
      !Number.isInteger(teamAScore) ||
      !Number.isInteger(teamBScore) ||
      teamAScore < 0 ||
      teamBScore < 0
    ) {
      setMessage("Please enter a valid score for both countries.");
      return;
    }

    setSavingMatch(match.id);
    setMessage("");

    try {
      const supabase = createClient();
      const rpcName =
        mode === "team"
          ? "save_team_knockout_prediction"
          : "save_solo_knockout_prediction";
      const { error } = await supabase.rpc(rpcName, {
        p_match_id: match.id,
        p_selected_winner_team_id: winnerId,
        p_predicted_team_a_score: teamAScore,
        p_predicted_team_b_score: teamBScore,
      });

      if (error) throw new Error(error.message);
      setMessage("Prediction saved. You can edit before the due date.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save prediction.");
    } finally {
      setSavingMatch("");
    }
  }

  const stageHub = (
    <section className="grid gap-3 rounded-lg bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f8a4b]">
          Game 2 Knockout Journey
        </p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">
          Knockout Winner Challenge
        </h2>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {knockoutRoundOrder.map((roundKey) => {
          const roundMatches = matchesByRound[roundKey] ?? [];
          const predictedCount = roundMatches.filter(
            (match) => predictionByMatch[match.id] || selectedByMatch[match.id],
          ).length;
          const scoredCount = roundMatches.filter(
            (match) => statusLabel(match, now) === "Scored",
          ).length;
          const lockedCount = roundMatches.filter(
            (match) => statusLabel(match, now) === "Locked",
          ).length;
          const openCount = roundMatches.filter((match) =>
            ["Open", "Closing Soon"].includes(statusLabel(match, now)),
          ).length;
          const statusText = !roundMatches.length
            ? "Waiting Fixtures"
            : scoredCount === roundMatches.length
              ? "Scored"
              : openCount > 0
                ? "Open"
                : lockedCount > 0
                  ? "Waiting Result"
                  : "Waiting Result";

          return (
            <button
              key={roundKey}
              type="button"
              onClick={() => setActiveRoundKey(roundKey)}
              className={clsx(
                "rounded-lg border p-3 text-left transition active:scale-[0.99]",
                activeRoundKey === roundKey
                  ? "border-[#d71920] bg-red-50"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300",
              )}
            >
              <p className="whitespace-pre-line text-sm font-black text-slate-950">
                {stageDisplayName(roundKey)}
              </p>
              <p
                className={clsx(
                  "mt-2 inline-flex rounded px-2 py-1 text-[11px] font-black",
                  statusText === "Open" && "bg-green-100 text-green-800",
                  statusText === "Waiting Fixtures" && "bg-yellow-100 text-yellow-800",
                  statusText === "Waiting Result" && "bg-slate-200 text-slate-700",
                  statusText === "Scored" && "bg-[#f4c542] text-[#071525]",
                )}
              >
                {statusText}
              </p>
              <p className="mt-3 text-xs font-bold text-slate-500">
                Predicted {predictedCount} / {roundMatches.length || knockoutRoundSlots[roundKey]}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                Matches {roundMatches.length} / {knockoutRoundSlots[roundKey]}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );

  const waitingPanel = (
    <section className="rounded-lg border border-yellow-200 bg-yellow-50 p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-700">
        Waiting Fixtures
      </p>
      <h2 className="mt-1 text-2xl font-black text-slate-950">
        Match list not available yet.
      </h2>
      <p className="mt-2 text-sm font-bold text-slate-600">
        {knockoutWaitingText[activeRoundKey]}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-600">
        Each match will close 15 minutes before kickoff once fixtures are published.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: knockoutRoundSlots[activeRoundKey] }).map((_, index) => (
          <div
            key={`game2-waiting-${activeRoundKey}-${index}`}
            className="rounded-lg border border-dashed border-yellow-300 bg-white/70 p-4"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-700">
              Match {index + 1}
            </p>
            <p className="mt-1 font-black text-slate-700">Waiting for qualified teams</p>
          </div>
        ))}
      </div>
    </section>
  );

  if (mode === "team" && !teamContext) {
    return (
      <div className="grid gap-5">
        <div className="card grid gap-4 p-5">
          <div className="rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
            Team formation is open now. Team match prediction will open after
            Round of 32 fixtures are confirmed and published by admin.
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Form your team by referral
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Use your personal referral link to invite friends. Friends who sign
              up from your link are grouped into your team automatically.
            </p>
            <a
              href="/squad"
              className="mt-4 flex h-11 w-full items-center justify-center rounded bg-[#d71920] font-black text-white"
            >
              Open My Team
            </a>
          </div>
        </div>
        {message ? (
          <div className="rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
            {message}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 rounded-lg bg-[#071525] p-4 text-white md:grid-cols-4">
        <div className="rounded bg-white/10 p-4">
          <p className="text-sm font-bold text-white/65">Selected round</p>
          <p className="mt-1 text-2xl font-black">
            {activeRound.split("\n").map((line) => (
              <span key={line} className="block leading-tight">
                {line}
              </span>
            ))}
          </p>
        </div>
        <div className="rounded bg-white/10 p-4">
          <p className="text-sm font-bold text-white/65">
            {mode === "team" ? "My final earned score" : "My final earned score"}
          </p>
          <p className="mt-1 text-2xl font-black">{totalPoints}</p>
        </div>
        <div className="rounded bg-white/10 p-4">
          <p className="text-sm font-bold text-white/65">
            {mode === "team" ? "Team ranking" : "My ranking"}
          </p>
          <p className="mt-1 text-2xl font-black">{ranking ? `#${ranking}` : "-"}</p>
        </div>
        <div className="rounded bg-white/10 p-4">
          <p className="text-sm font-bold text-white/65">Next due date</p>
          <p className="mt-1 text-sm font-black">
            {nextDue ? new Date(nextDue.prediction_lock_at).toLocaleString("en-MY") : "-"}
          </p>
        </div>
      </section>

      {stageHub}

      {mode === "team" && teamContext ? (
        <section className="card grid gap-4 p-5 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              {teamContext.team_name}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Code: <span className="font-black">{teamContext.team_code}</span>
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Team total: {teamContext.total_points} · Active members:{" "}
              {teamContext.active_member_count} · Average:{" "}
              {Number(teamContext.average_score).toFixed(2)}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard.writeText(
                `Join my Team Knockout Winner Challenge: ${teamContext.team_code}`,
              )
            }
            className="flex h-11 items-center justify-center gap-2 rounded bg-[#071525] px-4 font-black text-white"
          >
            <Copy size={16} /> Copy invite
          </button>
          <div className="md:col-span-2">
            <p className="mb-2 flex items-center gap-2 text-sm font-black text-[#0f8a4b]">
              <UsersRound size={16} /> Team members
            </p>
            <div className="flex flex-wrap gap-2">
              {teamContext.members.map((member) => (
                <span
                  key={`${member.nickname}-${member.role}`}
                  className="rounded bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700"
                >
                  {member.nickname} · {member.role}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {message ? (
        <div className="rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
          {message}
        </div>
      ) : null}

      {!activeMatches.length ? waitingPanel : null}

      {false && !matches.length ? (
        <div className="card p-5 text-center font-bold text-slate-600">
          {mode === "team"
            ? "Team formation is open now. Team match prediction will open after Round of 32 fixtures are confirmed and published by admin."
            : "32强名单确认中，预测即将开放。Round of 32 prediction opens after admin publishes fixtures."}
        </div>
      ) : null}

      {activeMatches.map((match) => {
        const selected = selectedByMatch[match.id];
        const prediction = predictionByMatch[match.id];
        const label = statusLabel(match, now);
        const locked = label === "Locked" || label === "Scored";

        return (
          <section key={match.id} className="card overflow-hidden">
            <div className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#071525] px-3 py-1 text-xs font-black text-white">
                    {stageDisplayName(match.round_key).split("\n").map((line) => (
                      <span key={line} className="block leading-tight">
                        {line}
                      </span>
                    ))}
                  </span>
                  <span
                    className={clsx(
                      "rounded px-3 py-1 text-xs font-black",
                      label === "Open" && "bg-green-100 text-green-800",
                      label === "Closing Soon" && "bg-yellow-100 text-yellow-900",
                      label === "Locked" && "bg-slate-200 text-slate-700",
                      label === "Scored" && "bg-[#f4c542] text-[#071525]",
                    )}
                  >
                    {label}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  {stageDescription(match.round_key)}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  Match date: {new Date(match.match_start_at).toLocaleString("en-MY")}
                </p>
                <p className="text-sm font-semibold text-slate-600">
                  Prediction due date (15 min before kickoff):{" "}
                  {new Date(match.prediction_lock_at).toLocaleString("en-MY")}
                </p>
                <p className="text-sm font-semibold text-slate-600">
                  Countdown: {countdownLabel(match.prediction_lock_at, now)}
                </p>
              </div>
              <div className="grid gap-2 rounded bg-slate-100 p-3 text-sm font-bold text-slate-700">
                <p>个人本场分 / Individual Match Score: {prediction?.individual_match_score ?? 0}</p>
                <p>团队累计分 / Team Accumulated Score: {prediction?.team_accumulated_score ?? 0}</p>
                <p className="text-[#d71920]">
                  最终获得分 / Final Earned Score:{" "}
                  {prediction?.final_earned_score ?? prediction?.points_earned ?? 0}
                </p>
              </div>
            </div>

            {label === "Locked" ? (
              <p className="mx-5 mt-4 rounded bg-slate-100 p-3 text-sm font-bold text-slate-700">
                Prediction is locked. Waiting for match result.
              </p>
            ) : null}
            {label === "Scored" && prediction ? (
              <div className="mx-5 mt-4 grid gap-2 rounded bg-slate-100 p-3 text-sm font-bold text-slate-700">
                <p>
                  Official result: {match.team_a.country_code} {match.team_a_score ?? "-"} -{" "}
                  {match.team_b_score ?? "-"} {match.team_b.country_code}
                </p>
                <p>
                  Your final earned score = your individual match score + your team's accumulated score.
                </p>
                <p>你的最终获得分 = 你的个人本场分 + 你所在团队的累计分。</p>
              </div>
            ) : null}

            <div className="grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] gap-2 p-5 sm:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)]">
              <div className="col-span-3 grid gap-1 rounded bg-slate-50 p-3 text-sm font-bold text-slate-600">
                <p>Level 1: Pick the winning country.</p>
                <p>Level 2: Guess both country scores. Winner pick and score guess are not linked.</p>
              </div>
              {[match.team_a, match.team_b].map((team, index) => {
                const flag = flagPath(team);
                const picked = selected === team.id;
                return (
                  <div
                    key={team.id}
                    role="button"
                    tabIndex={locked ? -1 : 0}
                    onClick={() => {
                      if (locked) return;
                      setSelectedByMatch((current) => ({
                        ...current,
                        [match.id]: team.id,
                      }));
                    }}
                    onKeyDown={(event) => {
                      if (locked || (event.key !== "Enter" && event.key !== " ")) return;
                      event.preventDefault();
                      setSelectedByMatch((current) => ({
                        ...current,
                        [match.id]: team.id,
                      }));
                    }}
                    className={clsx(
                      index === 0 ? "col-start-1" : "col-start-3",
                      "row-start-2 rounded-lg border-2 bg-white p-3 text-center shadow-sm transition",
                      picked
                        ? "border-[#d71920] bg-red-50"
                        : "border-slate-100 hover:border-[#0f8a4b]",
                      locked && "cursor-not-allowed opacity-70",
                    )}
                  >
                    <span className="mx-auto grid h-16 w-full max-w-28 place-items-center overflow-hidden rounded bg-slate-100 text-xs font-black text-slate-500">
                      {flag ? (
                        <Image
                          src={flag}
                          alt=""
                          width={112}
                          height={72}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        team.country_code
                      )}
                    </span>
                    <span className="mt-3 block truncate font-black text-slate-950">
                      {team.country_name}
                    </span>
                    <span className="text-sm font-bold text-slate-500">
                      {team.country_code}
                    </span>
                    <span
                      className={clsx(
                        "mx-auto mt-3 inline-flex rounded px-3 py-1 text-xs font-black",
                        picked ? "bg-[#d71920] text-white" : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {picked ? "Selected winner" : "Pick winner"}
                    </span>
                    <label className="mt-3 grid gap-1 text-left text-xs font-black text-slate-600">
                      Guess score
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        disabled={locked}
                        value={
                          index === 0
                            ? scoreByMatch[match.id]?.teamA ?? ""
                            : scoreByMatch[match.id]?.teamB ?? ""
                        }
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          const value = event.target.value;
                          setScoreByMatch((current) => {
                            const existing = current[match.id] ?? { teamA: "", teamB: "" };
                            return {
                              ...current,
                              [match.id]:
                                index === 0
                                  ? { ...existing, teamA: value }
                                  : { ...existing, teamB: value },
                            };
                          });
                        }}
                        className="h-10 rounded border border-slate-200 px-3 text-center text-base font-black text-slate-950 disabled:bg-slate-100"
                      />
                    </label>
                  </div>
                );
              })}
              <div className="col-start-2 row-start-2 flex items-center justify-center">
                <div className="grid size-12 place-items-center rounded-full bg-[#f4c542] text-sm font-black text-[#071525]">
                  VS
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 p-5">
              <button
                type="button"
                disabled={!selected || locked || Boolean(savingMatch)}
                onClick={() => save(match)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded bg-[#d71920] font-black text-white disabled:bg-slate-400"
              >
                {savingMatch === match.id ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                Submit Match Prediction
              </button>
              <p className="mt-3 text-xs font-bold text-slate-500">
                Winner pick and score guess are scored separately. Score accuracy gives +0,
                +1, or +3 only once per match.
              </p>
            </div>
          </section>
        );
      })}
    </div>
  );
}
