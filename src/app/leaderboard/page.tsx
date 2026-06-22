"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { LeaderboardTable, type LeaderboardRow } from "@/components/leaderboard";
import { getCurrentRound, profiles, referrals } from "@/lib/demo-data";
import { knockoutWinnerRankingTitle } from "@/lib/knockout-winner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type LeaderboardScope = "overall" | "round" | "squad" | "invite";

type SupabaseLeaderboardRow = {
  profile_id: string;
  display_name: string;
  avatar_url?: string;
  total_score: number;
  round_score: number;
  correct_predictions: number;
  total_predictions: number;
  accuracy_rate: number;
  rank_position: number;
  previous_rank_position?: number;
  invite_count: number;
};

const tabs: Array<{ id: LeaderboardScope; label: string; title: string }> = [
  { id: "overall", label: "总榜", title: knockoutWinnerRankingTitle },
  { id: "round", label: "本轮", title: "本轮淘汰赛赢家战排行榜" },
  { id: "squad", label: "好友战区", title: "好友战区排行榜" },
  { id: "invite", label: "人气榜", title: "邀请人气榜" },
];

function profileToRow(profile: (typeof profiles)[number]): LeaderboardRow {
  return {
    id: profile.id,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    totalScore: profile.totalScore,
    rank: profile.rank,
    previousRank: profile.previousRank,
    correctPredictions: profile.correctPredictions,
    totalPredictions: profile.totalPredictions,
  };
}

function demoRows(scope: LeaderboardScope): LeaderboardRow[] {
  if (scope === "squad") {
    const squadIds = new Set([
      "me",
      ...referrals.map((item) => item.referredProfileId),
    ]);
    return profiles.filter((profile) => squadIds.has(profile.id)).map(profileToRow);
  }

  if (scope === "invite") {
    return profiles
      .filter((profile) => profile.role === "player")
      .map((profile) => ({
        ...profileToRow(profile),
        inviteCount: referrals.filter(
          (referral) => referral.referrerProfileId === profile.id,
        ).length,
      }))
      .sort(
        (a, b) =>
          (b.inviteCount ?? 0) - (a.inviteCount ?? 0) ||
          b.totalScore - a.totalScore,
      )
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }

  if (scope === "round") {
    return profiles
      .filter((profile) => profile.role === "player")
      .map((profile) => ({
        ...profileToRow(profile),
        roundScore: Math.max(0, profile.totalScore - 35),
      }));
  }

  return profiles.filter((profile) => profile.role === "player").map(profileToRow);
}

function supabaseRowToRow(row: SupabaseLeaderboardRow): LeaderboardRow {
  return {
    id: row.profile_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    totalScore: row.total_score,
    roundScore: row.round_score,
    rank: row.rank_position,
    previousRank: row.previous_rank_position,
    correctPredictions: row.correct_predictions,
    totalPredictions: row.total_predictions,
    accuracyRate: Number(row.accuracy_rate),
    inviteCount: row.invite_count,
  };
}

export default function LeaderboardPage() {
  const currentRound = getCurrentRound();
  const [activeTab, setActiveTab] = useState<LeaderboardScope>("overall");
  const [rowsByScope, setRowsByScope] = useState<Record<LeaderboardScope, LeaderboardRow[]>>({
    overall: demoRows("overall"),
    round: demoRows("round"),
    squad: demoRows("squad"),
    invite: demoRows("invite"),
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadLeaderboards() {
      if (!isSupabaseConfigured()) return;

      setLoading(true);
      setMessage("");

      try {
        const supabase = createClient();
        const scopes: LeaderboardScope[] = ["overall", "round", "squad", "invite"];
        const nextRows = { ...rowsByScope };

        for (const scope of scopes) {
          const { data, error } = await supabase.rpc("get_leaderboard", {
            p_game_id: null,
            p_round_id: scope === "round" ? currentRound.id : null,
            p_scope: scope,
          });

          if (error) throw new Error(error.message);
          nextRows[scope] = ((data ?? []) as SupabaseLeaderboardRow[]).map(
            supabaseRowToRow,
          );
        }

        setRowsByScope(nextRows);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load ranking. Showing demo data for now.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRound.id]);

  const activeMeta = tabs.find((tab) => tab.id === activeTab)!;
  const rows = rowsByScope[activeTab];
  const topScore = Math.max(0, ...rows.map((row) => row.roundScore ?? row.totalScore));
  const topInvite = Math.max(0, ...rowsByScope.invite.map((row) => row.inviteCount ?? 0));

  return (
    <PageShell active="/leaderboard">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <SectionHeader
          eyebrow="Knockout Winner Challenge"
          title={knockoutWinnerRankingTitle}
          body="淘汰赛赢家战排行榜会在管理员确认实际赢家后自动更新。邀请人气只用于人气榜，不会直接加到赢家战分数。"
        />

        {message ? (
          <div className="mb-5 rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
            {message}
          </div>
        ) : null}

        <div className="mb-5 grid gap-4 md:grid-cols-4">
          <StatCard label="Current Round" value={currentRound.labelCn} tone="green" />
          <StatCard label="Current Board" value={activeMeta.label} tone="gold" />
          <StatCard label="Top Score" value={topScore} />
          <StatCard label="Top Invite" value={topInvite} tone="navy" />
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto scrollbar-clean">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "rounded px-4 py-2 text-sm font-black shadow-sm",
                activeTab === tab.id
                  ? "bg-[#d71920] text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <LeaderboardTable
          players={rows}
          title={loading ? `${activeMeta.title} · Loading...` : activeMeta.title}
          emptyText="No ranking yet. Ranking updates after admin confirms winners."
        />
      </main>
    </PageShell>
  );
}
