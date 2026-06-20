"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { LeaderboardTable, type LeaderboardRow } from "@/components/leaderboard";
import { getCurrentRound, profiles, referrals } from "@/lib/demo-data";
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
  { id: "overall", label: "总榜", title: "总排行榜" },
  { id: "round", label: "本轮", title: "本轮排行榜" },
  { id: "squad", label: "好友战区", title: "好友战区排行榜" },
  { id: "invite", label: "人气榜", title: "邀请人气榜" },
];

function demoRows(scope: LeaderboardScope): LeaderboardRow[] {
  if (scope === "squad") {
    const squadIds = new Set([
      "me",
      ...referrals.map((item) => item.referredProfileId),
    ]);
    return profiles
      .filter((profile) => squadIds.has(profile.id))
      .map(profileToRow);
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
            : "读取排行榜失败，当前显示 Demo 数据。",
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

  const explainer = useMemo(
    () => [
      "管理员确认赛果后，confirm_match_result 会计算每个 prediction 的得分。",
      "rebuild_leaderboards 会重新整理总榜和每轮榜，并写入 leaderboard_scores。",
      "总榜按 total_score、accuracy_rate、correct_predictions、created_at 排序。",
      "本轮榜只看当前 round_id 的 round_score。",
      "好友战区只显示自己、邀请关系、同队成员。",
      "人气榜按 invite_count 排序，不会加到预测主分。",
    ],
    [],
  );

  return (
    <PageShell active="/leaderboard">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <SectionHeader
          eyebrow="Leaderboard"
          title="排行榜"
          body="排行榜会在管理员确认赛果后自动更新。邀请人气只用于人气榜，不会直接加到预测分数。"
        />

        {message ? (
          <div className="mb-5 rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
            {message}
          </div>
        ) : null}

        <div className="mb-5 grid gap-4 md:grid-cols-4">
          <StatCard label="当前阶段" value={currentRound.labelCn} tone="green" />
          <StatCard label="当前榜单" value={activeMeta.label} tone="gold" />
          <StatCard label="榜首分数" value={topScore} />
          <StatCard label="最高邀请" value={topInvite} tone="navy" />
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

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <LeaderboardTable
            players={rows}
            title={loading ? `${activeMeta.title} · 读取中...` : activeMeta.title}
            emptyText="还没有可显示的排行榜。确认赛果后会出现排名。"
          />

          <section className="card p-5">
            <h2 className="text-xl font-black text-slate-950">
              排名如何产生
            </h2>
            <ol className="mt-4 grid gap-3">
              {explainer.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded bg-[#d71920] text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-sm font-semibold text-slate-700">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
