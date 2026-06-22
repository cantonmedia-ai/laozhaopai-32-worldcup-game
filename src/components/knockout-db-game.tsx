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
  actual_winner_team_id: string | null;
  status: "draft" | "open" | "locked" | "scored" | "completed";
  team_a: KnockoutTeam;
  team_b: KnockoutTeam;
};

export type KnockoutPrediction = {
  match_id: string;
  selected_winner_team_id: string;
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
  const [message, setMessage] = useState("");
  const [savingMatch, setSavingMatch] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [now, setNow] = useState(0);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    const firstUpdate = window.setTimeout(updateNow, 0);
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearTimeout(firstUpdate);
      window.clearInterval(timer);
    };
  }, []);

  const predictionByMatch = useMemo(
    () => Object.fromEntries(predictions.map((item) => [item.match_id, item])),
    [predictions],
  );

  const activeRound = matches[0] ? stageDisplayName(matches[0].round_key) : "Not Created";
  const nextDue = matches
    .filter((match) => new Date(match.prediction_lock_at).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.prediction_lock_at).getTime() -
        new Date(b.prediction_lock_at).getTime(),
    )[0];

  async function save(match: KnockoutMatch) {
    const winnerId = selectedByMatch[match.id];
    if (!winnerId || savingMatch) return;

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
      });

      if (error) throw new Error(error.message);
      setMessage("Prediction saved. You can edit before the due date.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save prediction.");
    } finally {
      setSavingMatch("");
    }
  }

  async function createTeam() {
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("create_game_team", {
        p_team_name: teamName,
      });
      if (error) throw new Error(error.message);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create team.");
    }
  }

  async function joinTeam() {
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("join_game_team", {
        p_team_code: teamCode,
      });
      if (error) throw new Error(error.message);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to join team.");
    }
  }

  if (mode === "team" && !teamContext) {
    return (
      <div className="grid gap-5">
        <div className="card grid gap-4 p-5 md:grid-cols-2">
          <div className="rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900 md:col-span-2">
            Team formation is open now. Team match prediction will open after
            Round of 32 fixtures are confirmed and published by admin.
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">Create a Team</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Each user can join one team. Team score uses average score.
            </p>
            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              className="mt-4 h-12 w-full rounded border border-slate-200 px-3 font-semibold"
              placeholder="Team name"
            />
            <button
              type="button"
              onClick={createTeam}
              className="mt-3 h-11 w-full rounded bg-[#d71920] font-black text-white"
            >
              Create Team
            </button>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">Join a Team</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Enter a team invite code from your friend.
            </p>
            <input
              value={teamCode}
              onChange={(event) => setTeamCode(event.target.value)}
              className="mt-4 h-12 w-full rounded border border-slate-200 px-3 font-semibold uppercase"
              placeholder="TEAMCODE"
            />
            <button
              type="button"
              onClick={joinTeam}
              className="mt-3 h-11 w-full rounded bg-[#071525] font-black text-white"
            >
              Join Team
            </button>
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
          <p className="text-sm font-bold text-white/65">Current round</p>
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
            {mode === "team" ? "My contribution" : "My points"}
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

      {!matches.length ? (
        <div className="card p-5 text-center font-bold text-slate-600">
          {mode === "team"
            ? "Team formation is open now. Team match prediction will open after Round of 32 fixtures are confirmed and published by admin."
            : "32强名单确认中，预测即将开放。Round of 32 prediction opens after admin publishes fixtures."}
        </div>
      ) : null}

      {matches.map((match) => {
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
                  Prediction due date:{" "}
                  {new Date(match.prediction_lock_at).toLocaleString("en-MY")}
                </p>
                <p className="text-sm font-semibold text-slate-600">
                  Countdown: {countdownLabel(match.prediction_lock_at, now)}
                </p>
              </div>
              <div className="rounded bg-slate-100 p-3 text-sm font-bold text-slate-700">
                Points earned: {prediction?.points_earned ?? 0}
              </div>
            </div>

            {label === "Locked" ? (
              <p className="mx-5 mt-4 rounded bg-slate-100 p-3 text-sm font-bold text-slate-700">
                Prediction is locked. Waiting for match result.
              </p>
            ) : null}
            {label === "Scored" && prediction ? (
              <p className="mx-5 mt-4 rounded bg-slate-100 p-3 text-sm font-bold text-slate-700">
                {prediction.is_correct
                  ? `You guessed correctly and earned ${prediction.points_earned ?? 0} points.`
                  : "Your prediction was incorrect. Better luck next round."}
              </p>
            ) : null}

            <div className="grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] gap-2 p-5 sm:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)]">
              {[match.team_a, match.team_b].map((team, index) => {
                const flag = flagPath(team);
                const picked = selected === team.id;
                return (
                  <button
                    key={team.id}
                    type="button"
                    disabled={locked}
                    onClick={() =>
                      setSelectedByMatch((current) => ({
                        ...current,
                        [match.id]: team.id,
                      }))
                    }
                    className={clsx(
                      index === 0 ? "col-start-1" : "col-start-3",
                      "row-start-1 rounded-lg border-2 bg-white p-3 text-center shadow-sm",
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
                  </button>
                );
              })}
              <div className="col-start-2 row-start-1 flex items-center justify-center">
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
                Submit Winner
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
