"use client";

import { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import {
  knockoutWinnerCta,
  knockoutWinnerNameCn,
  knockoutWinnerNameEn,
  knockoutWinnerSubtitle,
} from "@/lib/knockout-winner";
import { logClientAction, logClientError } from "@/lib/monitoring-client";
import { getTeam, predictions, rounds } from "@/lib/demo-data";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { stageDisplayName } from "@/lib/stage-labels";
import type { Match } from "@/types/game";
import { MatchCard, type MatchScoreGuess } from "./match-card";

type PredictionDraft = {
  winnerTeamId?: string;
  score: MatchScoreGuess;
  pointsEarned?: number;
  scored?: boolean;
};

function isValidDraft(draft: PredictionDraft) {
  return Boolean(draft.winnerTeamId);
}

function roundName(roundId: string) {
  const round = rounds.find((item) => item.id === roundId);
  return stageDisplayName(round?.id ?? roundId);
}

export function PredictionBoard({ matches }: { matches: Match[] }) {
  const initial = useMemo(() => {
    return Object.fromEntries(
      matches.map((match) => {
        const savedPrediction = predictions.find(
          (prediction) =>
            prediction.profileId === "me" && prediction.matchId === match.id,
        );

        return [
          match.id,
          {
            winnerTeamId: savedPrediction?.predictedWinnerTeamId,
            score: {
              teamA: "",
              teamB: "",
            },
            pointsEarned: savedPrediction?.scoreAwarded ?? 0,
            scored: Boolean(savedPrediction?.scoreAwarded),
          },
        ];
      }),
    ) as Record<string, PredictionDraft>;
  }, [matches]);

  const [drafts, setDrafts] = useState<Record<string, PredictionDraft>>(initial);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const completedCount = matches.filter((match) =>
    isValidDraft(drafts[match.id]),
  ).length;
  const complete = completedCount === matches.length;

  useEffect(() => {
    void logClientAction({
      actionType: "game2_page_view",
      actionStatus: "info",
      pagePath: "/predict",
      gameKey: "game2",
      message: "Game 2 page viewed.",
      metadata: { matchCount: matches.length },
    });
  }, [matches.length]);

  async function submitPredictions() {
    if (!complete || saving) return;

    setSaving(true);
    setSaved(false);
    setErrorMessage("");
    void logClientAction({
      actionType: "game2_match_submit_attempt",
      actionStatus: "info",
      pagePath: "/predict",
      gameKey: "game2",
      message: "Game 2 prediction submit attempted.",
      metadata: { matchCount: matches.length },
    });

    try {
      if (!isSupabaseConfigured()) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setSaved(true);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please login before submitting.");
      }

      for (const match of matches) {
        const draft = drafts[match.id];

        if (!isValidDraft(draft) || !draft.winnerTeamId) {
          throw new Error("Please pick a winner for every open match.");
        }

        const { error } = await supabase.rpc("submit_prediction", {
          p_match_id: match.id,
          p_predicted_winner_team_id: draft.winnerTeamId,
          p_predicted_team_a_score: null,
          p_predicted_team_b_score: null,
        });

        if (error) throw new Error(error.message);
      }

      setSaved(true);
      void logClientAction({
        actionType: "game2_match_submit_success",
        actionStatus: "success",
        pagePath: "/predict",
        gameKey: "game2",
        message: "Game 2 predictions submitted.",
        metadata: { matchCount: matches.length },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Submit failed. Please try again.";
      const referenceId = await logClientError({
        errorType: message.toLowerCase().includes("deadline")
          ? "deadline_error"
          : "database_error",
        errorMessage: message,
        functionName: "PredictionBoard.submitPredictions",
        pagePath: "/predict",
        gameKey: "game2",
        metadata: { matchCount: matches.length },
      });
      void logClientAction({
        actionType: message.toLowerCase().includes("deadline")
          ? "game2_match_blocked_by_deadline"
          : "game2_match_submit_failed",
        actionStatus: "failed",
        pagePath: "/predict",
        gameKey: "game2",
        message,
        metadata: { errorReferenceId: referenceId },
      });
      setErrorMessage(
        referenceId
          ? `${message} Please screenshot this code and send to admin: ${referenceId}`
          : message,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg bg-[#071525] p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white/65">
              {knockoutWinnerNameCn}
            </p>
            <p className="text-xl font-black">{knockoutWinnerNameEn}</p>
            <p className="mt-1 text-sm font-semibold text-white/70">
              {knockoutWinnerSubtitle}
            </p>
          </div>
          <div className="rounded bg-white/10 px-3 py-2 text-sm font-bold">
            Picked {completedCount}/{matches.length} winners
          </div>
        </div>
      </div>

      {matches.map((match) => {
        const draft = drafts[match.id];

        return (
          <MatchCard
            key={match.id}
            match={match}
            teamA={getTeam(match.teamAId)}
            teamB={getTeam(match.teamBId)}
            selectedTeamId={draft.winnerTeamId}
            score={draft.score}
            roundName={roundName(match.roundId)}
            pointsEarned={draft.pointsEarned}
            scored={draft.scored}
            onSelect={(teamId) => {
              setSaved(false);
              setErrorMessage("");
              setDrafts((current) => ({
                ...current,
                [match.id]: {
                  ...current[match.id],
                  winnerTeamId: teamId,
                },
              }));
            }}
          />
        );
      })}

      <div className="sticky bottom-16 z-20 rounded-lg bg-[#071525] p-4 shadow-2xl md:bottom-4">
        <button
          disabled={!complete || saving}
          onClick={submitPredictions}
          className="flex h-12 w-full items-center justify-center gap-2 rounded bg-[#d71920] px-5 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          <Send size={18} /> {saving ? "Submitting..." : knockoutWinnerCta}
        </button>
        <p className="mt-2 text-center text-sm font-semibold text-white/70">
          {errorMessage
            ? errorMessage
            : saved
              ? "Your winner picks are saved. You can edit before lock time."
              : complete
                ? "All winners selected. Submit before lock time."
                : "Pick a winner for every open match."}
        </p>
      </div>
    </div>
  );
}
