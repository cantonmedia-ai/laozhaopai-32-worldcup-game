"use client";

import { Check, LockKeyhole, Minus, Plus } from "lucide-react";
import clsx from "clsx";
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
  score,
  locked,
  onSelect,
  onScoreChange,
}: {
  match: Match;
  teamA: Team;
  teamB: Team;
  selectedTeamId?: string;
  score: MatchScoreGuess;
  locked?: boolean;
  onSelect?: (teamId: string) => void;
  onScoreChange?: (score: MatchScoreGuess) => void;
}) {
  const options = [
    {
      team: teamA,
      side: "teamA" as const,
      value: score.teamA,
      columnClass: "col-start-1",
    },
    {
      team: teamB,
      side: "teamB" as const,
      value: score.teamB,
      columnClass: "col-start-3",
    },
  ];

  function setScore(side: "teamA" | "teamB", nextValue: number | "") {
    if (locked) return;

    onScoreChange?.({
      ...score,
      [side]: nextValue === "" ? "" : Math.max(0, Math.min(99, nextValue)),
    });
  }

  function bumpScore(side: "teamA" | "teamB", delta: number) {
    const current = Number(score[side] || 0);
    setScore(side, current + delta);
  }

  return (
    <div
      className={clsx(
        "card overflow-hidden p-4",
        selectedTeamId && "ring-2 ring-[#0f8a4b]/20",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3 text-sm">
        <span className="rounded bg-[#071525] px-3 py-1 font-black text-white">
          Match {match.matchNo}
        </span>
        <span className="text-right font-semibold text-slate-500">
          截止 {new Date(match.predictionDeadline).toLocaleString("zh-MY")}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] sm:gap-3">
        {options.map(({ team, side, value, columnClass }) => (
          <div
            key={team.id}
            className={clsx(
              columnClass,
              "row-start-1 flex h-full min-h-[300px] min-w-0 flex-col rounded-lg border-2 bg-white p-3 text-center transition",
              selectedTeamId === team.id
                ? "border-[#d71920] bg-red-50 shadow-md"
                : "border-slate-100 hover:border-[#0f8a4b]",
              locked && "cursor-not-allowed opacity-75",
            )}
          >
            <button
              type="button"
              disabled={locked}
              onClick={() => onSelect?.(team.id)}
              className="block w-full"
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
                  "mx-auto mt-3 flex min-h-7 w-fit items-center gap-1 rounded px-3 py-1 text-xs font-black",
                  selectedTeamId === team.id
                    ? "bg-[#d71920] text-white"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {selectedTeamId === team.id ? (
                  <>
                    <Check size={14} /> Level 1 Winner
                  </>
                ) : (
                  "Pick Winner"
                )}
              </span>
            </button>

            <div className="mt-auto pt-4">
              <div className="rounded bg-slate-50 p-2">
                <p className="mb-2 text-xs font-black uppercase text-slate-500">
                  Level 2 Score
                </p>
                <div className="grid grid-cols-[36px_1fr_36px] items-center gap-2">
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => bumpScore(side, -1)}
                    className="grid size-9 place-items-center rounded bg-white text-slate-700 shadow-sm disabled:opacity-50"
                    aria-label={`Decrease ${team.name} score`}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    disabled={locked}
                    value={value}
                    onChange={(event) =>
                      setScore(
                        side,
                        event.target.value === ""
                          ? ""
                          : Number(event.target.value),
                      )
                    }
                    className="h-11 w-full rounded border border-slate-200 text-center text-2xl font-black text-slate-950"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => bumpScore(side, 1)}
                    className="grid size-9 place-items-center rounded bg-white text-slate-700 shadow-sm disabled:opacity-50"
                    aria-label={`Increase ${team.name} score`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

          <div className="col-start-2 row-start-1 flex h-full min-h-[300px] items-center justify-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#f4c542] text-sm font-black text-[#071525]">
            VS
          </div>
        </div>
      </div>

      <div className="mt-4 rounded bg-slate-100 p-3 text-sm font-semibold text-slate-600">
        <span className="font-black text-slate-800">Level 1:</span>{" "}
        {selectedTeamId
          ? `Winner pick is ${selectedTeamId === teamA.id ? teamA.name : teamB.name}.`
          : "Pick the team you think will advance."}
        <span className="ml-2 font-black text-slate-800">Level 2:</span> Score
        guess is separate, so it can be different from your winner pick.
      </div>

      {locked ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-500">
          <LockKeyhole size={16} /> Prediction locked
        </p>
      ) : null}
    </div>
  );
}
