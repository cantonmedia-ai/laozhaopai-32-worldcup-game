"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { getTeam, predictions } from "@/lib/demo-data";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Match } from "@/types/game";
import { MatchCard, type MatchScoreGuess } from "./match-card";

type PredictionDraft = {
  winnerTeamId?: string;
  score: MatchScoreGuess;
};

function isValidDraft(draft: PredictionDraft) {
  if (!draft.winnerTeamId) return false;
  if (draft.score.teamA === "" || draft.score.teamB === "") return false;
  return true;
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
              teamA: savedPrediction?.predictedTeamAScore ?? "",
              teamB: savedPrediction?.predictedTeamBScore ?? "",
            },
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

  async function submitPredictions() {
    if (!complete || saving) return;

    setSaving(true);
    setSaved(false);
    setErrorMessage("");

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
        throw new Error("请先登录后再提交预测。");
      }

      for (const match of matches) {
        const draft = drafts[match.id];

        if (!isValidDraft(draft) || !draft.winnerTeamId) {
          throw new Error("请先完成每场 Level 1 winner 和 Level 2 双方比分。");
        }

        const { error } = await supabase.rpc("submit_prediction", {
          p_match_id: match.id,
          p_predicted_winner_team_id: draft.winnerTeamId,
          p_predicted_team_a_score: Number(draft.score.teamA),
          p_predicted_team_b_score: Number(draft.score.teamB),
        });

        if (error) throw new Error(error.message);
      }

      setSaved(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "提交失败，请稍后再试。",
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
              Prediction Progress
            </p>
            <p className="text-xl font-black">
              已完成 {completedCount}/{matches.length} 场
            </p>
          </div>
          <div className="rounded bg-white/10 px-3 py-2 text-sm font-bold">
            Level 1 Winner + Level 2 Score
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
            onScoreChange={(score) => {
              setSaved(false);
              setErrorMessage("");
              setDrafts((current) => ({
                ...current,
                [match.id]: {
                  ...current[match.id],
                  score,
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
          <Send size={18} /> {saving ? "提交中..." : "提交预测"}
        </button>
        <p className="mt-2 text-center text-sm font-semibold text-white/70">
          {errorMessage
            ? errorMessage
            : saved
              ? isSupabaseConfigured()
                ? "预测已保存到 Supabase：Level 1 winner 和 Level 2 scores 都已写入 predictions 表。"
                : "Demo 已保存：连接 Supabase 后会写入 winner + predicted_team_a_score + predicted_team_b_score。"
              : complete
                ? "全部完成，可以提交。截止前仍可修改。"
                : "请完成每场 Level 1 winner 和 Level 2 双方比分。"}
        </p>
      </div>
    </div>
  );
}
