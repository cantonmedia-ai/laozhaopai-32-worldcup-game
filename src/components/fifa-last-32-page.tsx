import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift, Medal, Share2, Trophy } from "lucide-react";
import { AuthButtons } from "@/components/auth-buttons";
import { LeaderboardTable, type LeaderboardRow } from "@/components/leaderboard";
import { LiveScoreboard } from "@/components/live-scoreboard";
import { PageShell, StatCard } from "@/components/app-shell";
import { ReferralInviteBanner } from "@/components/referral-invite-banner";
import { TeamFlag } from "@/components/team-flag";
import { teams } from "@/lib/demo-data";
import {
  knockoutWinnerCta,
  knockoutWinnerDescription,
  knockoutWinnerNameCn,
  knockoutWinnerNameEn,
  knockoutWinnerRankingTitle,
  knockoutWinnerSubtitle,
} from "@/lib/knockout-winner";
import {
  knockoutStageOrder,
  stageDescription,
  stageDisplayName,
} from "@/lib/stage-labels";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

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
  previous_rank_position: number | null;
  invite_count: number;
};

function supabaseRowToRow(row: SupabaseLeaderboardRow): LeaderboardRow {
  return {
    id: row.profile_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    totalScore: row.total_score,
    roundScore: row.round_score,
    rank: row.rank_position,
    previousRank: row.previous_rank_position ?? undefined,
    correctPredictions: row.correct_predictions,
    totalPredictions: row.total_predictions,
    accuracyRate: Number(row.accuracy_rate),
    inviteCount: row.invite_count,
  };
}

async function loadPublicLeaderboard() {
  if (!hasSupabaseServerEnv()) return [];

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_leaderboard", {
    p_game_id: null,
    p_round_id: null,
    p_scope: "overall",
  });

  return ((data ?? []) as SupabaseLeaderboardRow[]).map(supabaseRowToRow);
}

export async function FifaLast32Page() {
  const leaderboardRows = await loadPublicLeaderboard();

  return (
    <PageShell active="/fifa-last-32" publicMode>
      <section className="stadium-hero relative w-full overflow-hidden text-white">
        <Image
          src="/assets/elements/png/confetti_strip.png"
          alt=""
          width={1200}
          height={260}
          className="pointer-events-none absolute inset-x-0 top-0 h-20 w-full object-cover opacity-55 md:h-32 md:opacity-65"
          priority
        />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-6 px-4 py-6 md:min-h-[86vh] md:grid-cols-[1.1fr_0.9fr] md:gap-8 md:py-12">
          <div className="relative z-10 min-w-0">
            <p className="mb-2 inline-flex rounded bg-[#f4c542] px-3 py-1 text-xs font-black text-[#071525] md:mb-4 md:text-sm">
              FIFA World Cup 2026
            </p>
            <h1 className="max-w-full whitespace-normal break-words text-[32px] font-black leading-[1.04] md:max-w-3xl md:text-7xl md:leading-tight">
              {knockoutWinnerNameCn}
              <br />
              <span className="text-2xl md:text-5xl">{knockoutWinnerNameEn}</span>
            </h1>
            <p className="mt-3 max-w-full whitespace-normal break-words text-sm font-semibold leading-relaxed text-white/85 md:mt-5 md:max-w-2xl md:text-xl">
              {knockoutWinnerSubtitle} {knockoutWinnerDescription}
            </p>
            <div className="mt-5 flex w-full flex-col gap-3 sm:flex-row md:mt-8">
              <Link
                href="/login?next=/predict"
                className="inline-flex h-13 w-full items-center justify-center gap-2 rounded bg-[#d71920] px-5 text-center font-black text-white shadow-lg shadow-red-950/30 hover:bg-red-700 sm:w-auto md:px-6"
              >
                {knockoutWinnerCta} <ArrowRight size={18} />
              </Link>
              <Link
                href="/rules"
                className="inline-flex h-13 w-full items-center justify-center rounded border border-white/30 px-5 text-center font-black text-white hover:bg-white/10 sm:w-auto md:px-6"
              >
                Rules & Prizes
              </Link>
            </div>
            <div className="mt-5 hidden max-w-3xl grid-cols-2 gap-2 md:mt-8 md:grid md:grid-cols-4 md:gap-3">
              {knockoutStageOrder.slice(0, 4).map((stage) => (
                <div
                  key={stage}
                  className="rounded border border-white/15 bg-white/10 px-2 py-3 text-center text-xs font-black backdrop-blur md:text-sm"
                >
                  {stageDisplayName(stage).split("\n").map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-5 flex w-full max-w-full flex-nowrap gap-3 overflow-x-auto pb-3 pr-6 scrollbar-clean md:mt-6 md:max-w-3xl md:pr-0">
              {teams.slice(0, 8).map((team) => (
                <div
                  key={team.id}
                  className="min-w-[76px] shrink-0 rounded bg-white/10 p-1.5 backdrop-blur md:w-24 md:p-2"
                >
                  <TeamFlag team={team} className="h-10 w-full md:h-14" />
                  <p className="mt-1 truncate text-center text-[10px] font-black text-white md:mt-2 md:text-xs">
                    {team.shortName}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10 min-w-0 w-full pb-6 md:pb-0">
            <div className="card mx-auto w-full max-w-md overflow-hidden bg-white/95 p-4 text-slate-950 md:max-w-none md:p-5">
              <ReferralInviteBanner />
              <div className="mb-4 flex items-center gap-3">
                <Image
                  src="/assets/elements/png/gold_trophy_badge.png"
                  alt="Trophy"
                  width={64}
                  height={64}
                  className="size-14 shrink-0 md:size-[82px]"
                />
                <div className="min-w-0">
                  <p className="text-xs font-black text-[#0f8a4b] md:text-sm">
                    FIFA World Cup 2026
                  </p>
                  <h2 className="text-2xl font-black leading-tight md:text-3xl">
                    Join the Game
                  </h2>
                </div>
              </div>
              <p className="mb-5 break-words text-sm font-semibold leading-relaxed text-slate-600">
                Sign in to play, save your score, and receive prize updates if you win.
              </p>
              <AuthButtons next="/game" />
              <p className="mt-4 break-words rounded bg-slate-100 p-3 text-center text-xs font-bold text-slate-600">
                Your WhatsApp number is only used for prize notification.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 md:grid-cols-[0.85fr_1.15fr] md:gap-6 md:py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:gap-4">
          <StatCard
            label="Current Round"
            value="32强生死战"
            detail="Round of 32"
            tone="green"
          />
          <StatCard label="Correct Winner" value="5 pts" tone="gold" />
          <StatCard label="Players" value={leaderboardRows.length} detail="Signed up" />
          <StatCard label="Referral" value="Invite Rank" tone="navy" />
        </div>
        <LeaderboardTable
          players={leaderboardRows.slice(0, 4)}
          title={knockoutWinnerRankingTitle}
          emptyText="No players signed up yet."
        />
      </section>
      <LiveScoreboard />
      <section className="w-full bg-white px-4 py-6 md:py-10">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {[
            [knockoutWinnerNameCn, stageDescription("last_32"), Trophy],
            ["好友战队", "分享专属链接，把朋友拉进你的战区。", Share2],
            ["Prize Setting", "Knockout Winner Challenge Ranking 决定个人赢家战奖品。", Gift],
          ].map(([title, body, Icon]) => {
            const IconComponent = Icon as typeof Medal;
            return (
              <div key={String(title)} className="rounded-lg bg-slate-100 p-5">
                <IconComponent className="text-[#d71920]" size={28} />
                <h3 className="mt-4 text-xl font-black">{title as string}</h3>
                <p className="mt-2 text-slate-600">{body as string}</p>
              </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
