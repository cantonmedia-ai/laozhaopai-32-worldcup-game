"use client";

import { Check, Clock, LockKeyhole } from "lucide-react";
import clsx from "clsx";
import { countdownLabel, matchStatusLabel } from "@/lib/knockout-winner";
import type { Match, Team } from "@/types/game";
import { TeamFlag } from "./team-flag";

export type MatchScoreGuess = {
  teamA: number | "";
  teamB: number | "";
};

export function MatchCard({
  match,
  teamA,
  teamB,
  selectedTeamId,
  locked,
  roundName,
  pointsEarned,
  scored,
  onSelect,
}: {
  match: Match;
  teamA: Team;
  teamB: Team;
  selectedTeamId?: string;
  score: MatchScoreGuess;
  locked?: boolean;
  roundName?: string;
  pointsEarned?: number;
  scored?: boolean;
  onSelect?: (teamId: string) => void;
  onScoreChange?: (score: MatchScoreGuess) => void;
}) {
  const statusLabel = matchStatusLabel(match.status, match.predictionDeadline, scored);
  const readOnly = locked || statusLabel !== "Open";
  const selectedTeam =
    selectedTeamId === teamA.id ? teamA : selectedTeamId === teamB.id ? teamB : null;
  const options = [teamA, teamB];

  return (
    <div
      className={clsx(
        "card overflow-hidden p-4",
        selectedTeamId && "ring-2 ring-[#0f8a4b]/20",
      )}
    >
      <div className="mb-4 grid gap-3 text-sm sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-[#071525] px-3 py-1 font-black text-white">
            {roundName ?? "Last 32"}
          </span>
          <span className="rounded bg-slate-100 px-3 py-1 font-black text-slate-700">
            Match {match.matchNo}
          </span>
          <span
            className={clsx(
              "rounded px-3 py-1 font-black",
              statusLabel === "Open" && "bg-green-100 text-green-800",
              statusLabel === "Locked" && "bg-slate-200 text-slate-700",
              statusLabel === "Scored" && "bg-[#f4c542] text-[#071525]",
            )}
          >
            {statusLabel}
          </span>
        </div>
        <div className="grid gap-1 text-left font-semibold text-slate-500 sm:text-right">
          <span>Match start time: {new Date(match.matchTime).toLocaleString("en-MY")}</span>
          <span>Prediction due date: {new Date(match.predictionDeadline).toLocaleString("en-MY")}</span>
          <span className="inline-flex items-center gap-1 sm:justify-end">
            <Clock size={14} /> Countdown: {countdownLabel(match.predictionDeadline)}
          </span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded bg-slate-100 p-3 text-sm font-bold text-slate-700">
        <span>User selected winner: {selectedTeam ? selectedTeam.name : "Not selected"}</span>
        <span className="text-[#d71920]">Points earned: {pointsEarned ?? 0}</span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] sm:gap-3">
        {options.map((team, index) => (
          <div
            key={team.id}
            className={clsx(
              index === 0 ? "col-start-1" : "col-start-3",
              "row-start-1 flex h-full min-h-[220px] min-w-0 flex-col rounded-lg border-2 bg-white p-3 text-center transition",
              selectedTeamId === team.id
                ? "border-[#d71920] bg-red-50 shadow-md"
                : "border-slate-100 hover:border-[#0f8a4b]",
              readOnly && "cursor-not-allowed opacity-75",
            )}
          >
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onSelect?.(team.id)}
              className="flex h-full w-full flex-col"
            >
              <TeamFlag
                team={team}
                className="mx-auto h-16 w-full max-w-40 sm:h-20"
                priority={match.matchNo <= 2}
              />
              <span className="mt-3 block min-h-7 truncate text-base font-black text-slate-950 sm:text-lg">
                {team.name}
              </span>
              <span className="block min-h-5 text-sm font-bold text-slate-500">
                {team.shortName}
              </span>
              <span
                className={clsx(
                  "mx-auto mt-auto flex min-h-7 w-fit items-center gap-1 rounded px-3 py-1 text-xs font-black",
                  selectedTeamId === team.id
                    ? "bg-[#d71920] text-white"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {selectedTeamId === team.id ? (
                  <>
                    <Check size={14} /> Selected Winner
                  </>
                ) : (
                  "Pick Winner"
                )}
              </span>
            </button>
          </div>
        ))}

        <div className="col-start-2 row-start-1 flex h-full min-h-[220px] items-center justify-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#f4c542] text-sm font-black text-[#071525]">
            VS
          </div>
        </div>
      </div>

      <div className="mt-4 rounded bg-slate-100 p-3 text-sm font-semibold text-slate-600">
        <span className="font-black text-slate-800">Winner prediction:</span>{" "}
        {selectedTeam
          ? `You picked ${selectedTeam.name} to advance.`
          : "Pick the team you think will advance."}
      </div>

      {readOnly ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-500">
          <LockKeyhole size={16} /> Prediction locked
        </p>
      ) : null}
    </div>
  );
}
