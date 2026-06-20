import { Medal, Trophy } from "lucide-react";
import { accuracy } from "@/lib/scoring";
import type { Profile } from "@/types/game";

export type LeaderboardRow = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  totalScore: number;
  roundScore?: number;
  rank: number;
  previousRank?: number;
  correctPredictions: number;
  totalPredictions: number;
  accuracyRate?: number;
  inviteCount?: number;
};

export function LeaderboardTable({
  players,
  title = "排行榜",
  emptyText = "暂无排行榜数据。",
}: {
  players: Array<Profile | LeaderboardRow>;
  title?: string;
  emptyText?: string;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <Trophy className="text-[#f4c542]" size={22} />
      </div>
      <div className="divide-y divide-slate-100">
        {players.length === 0 ? (
          <p className="p-5 text-sm font-bold text-slate-500">{emptyText}</p>
        ) : null}
        {players.map((player) => {
          const row = {
            id: player.id,
            displayName: player.displayName,
            totalScore: player.totalScore,
            roundScore: "roundScore" in player ? player.roundScore : undefined,
            rank: player.rank,
            previousRank:
              "previousRank" in player ? player.previousRank : undefined,
            correctPredictions: player.correctPredictions,
            totalPredictions: player.totalPredictions,
            accuracy:
              "accuracyRate" in player && typeof player.accuracyRate === "number"
                ? Math.round(player.accuracyRate)
                : accuracy(player as Profile),
            inviteCount:
              "inviteCount" in player ? player.inviteCount : undefined,
          };

          return (
            <div
              key={row.id}
              className="grid grid-cols-[48px_1fr_auto] items-center gap-3 px-5 py-4"
            >
              <div className="flex size-10 items-center justify-center rounded bg-slate-100 font-black text-slate-700">
                {row.rank <= 3 ? (
                  <Medal
                    size={20}
                    className={
                      row.rank === 1
                        ? "text-[#f4c542]"
                        : row.rank === 2
                          ? "text-slate-400"
                          : "text-orange-600"
                    }
                  />
                ) : (
                  row.rank
                )}
              </div>
              <div>
                <p className="font-black text-slate-950">{row.displayName}</p>
                <p className="text-sm text-slate-500">
                  命中 {row.correctPredictions}/{row.totalPredictions} ·{" "}
                  {row.accuracy}%
                  {typeof row.inviteCount === "number"
                    ? ` · 邀请 ${row.inviteCount}`
                    : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-[#d71920]">
                  {row.roundScore ?? row.totalScore}
                </p>
                <p className="text-xs font-bold text-slate-500">分</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
