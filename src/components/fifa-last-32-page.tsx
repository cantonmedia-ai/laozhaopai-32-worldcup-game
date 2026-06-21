import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift, Medal, Share2, Trophy } from "lucide-react";
import { AuthButtons } from "@/components/auth-buttons";
import { LeaderboardTable } from "@/components/leaderboard";
import { LiveScoreboard } from "@/components/live-scoreboard";
import { PageShell, StatCard } from "@/components/app-shell";
import { TeamFlag } from "@/components/team-flag";
import { getCurrentRound, profiles, teams } from "@/lib/demo-data";

export function FifaLast32Page() {
  const round = getCurrentRound();

  return (
    <PageShell active="/fifa-last-32">
      <section className="stadium-hero relative overflow-hidden text-white">
        <Image
          src="/assets/elements/png/confetti_strip.png"
          alt=""
          width={1200}
          height={260}
          className="pointer-events-none absolute inset-x-0 top-0 h-20 w-full object-cover opacity-55 md:h-32 md:opacity-65"
          priority
        />
        <div className="mx-auto grid max-w-7xl items-center gap-4 px-4 py-5 md:min-h-[86vh] md:grid-cols-[1.1fr_0.9fr] md:gap-8 md:py-12">
          <div className="relative z-10">
            <p className="mb-2 inline-flex rounded bg-[#f4c542] px-3 py-1 text-xs font-black text-[#071525] md:mb-4 md:text-sm">
              FIFA World Cup 2026
            </p>
            <h1 className="max-w-3xl text-[2rem] font-black leading-[1.04] md:text-7xl md:leading-tight">
              Last 32 Challenge
            </h1>
            <p className="mt-3 max-w-2xl text-[0.95rem] font-semibold leading-relaxed text-white/85 md:mt-5 md:text-xl">
              老招牌 32强冠军竞猜赛：预测王之战，谁是冠军预言家？从32强一路猜到决赛，每一轮揭晓都会更新排行榜。
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row md:mt-8 md:gap-3">
              <Link
                href="/login?next=/predict"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-[#d71920] px-5 font-black text-white shadow-lg shadow-red-950/30 hover:bg-red-700 sm:w-auto md:h-13 md:px-6"
              >
                立即参加 <ArrowRight size={18} />
              </Link>
              <Link
                href="/rules"
                className="inline-flex h-11 w-full items-center justify-center rounded border border-white/30 px-5 font-black text-white hover:bg-white/10 sm:w-auto md:h-13 md:px-6"
              >
                查看规则
              </Link>
            </div>
            <div className="mt-5 hidden max-w-3xl grid-cols-2 gap-2 md:mt-8 md:grid md:grid-cols-4 md:gap-3">
              {["32强开始", "16强对决", "8强争夺", "决赛之夜"].map(
                (stage) => (
                  <div
                    key={stage}
                    className="rounded border border-white/15 bg-white/10 px-2 py-3 text-center text-xs font-black backdrop-blur md:text-sm"
                  >
                    {stage}
                  </div>
                ),
              )}
            </div>
            <div className="mt-4 flex max-w-3xl gap-2 overflow-x-auto pb-2 scrollbar-clean md:mt-6 md:gap-3">
              {teams.slice(0, 8).map((team) => (
                <div
                  key={team.id}
                  className="w-16 shrink-0 rounded bg-white/10 p-1.5 backdrop-blur md:w-24 md:p-2"
                >
                  <TeamFlag team={team} className="h-10 w-full md:h-14" />
                  <p className="mt-1 truncate text-center text-[10px] font-black text-white md:mt-2 md:text-xs">
                    {team.shortName}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10">
            <div className="card bg-white/95 p-3.5 text-slate-950 md:p-5">
              <div className="mb-4 flex items-center gap-3">
                <Image
                  src="/assets/elements/png/gold_trophy_badge.png"
                  alt="Trophy"
                  width={64}
                  height={64}
                  className="md:size-[82px]"
                />
                <div>
                  <p className="text-xs font-black text-[#0f8a4b] md:text-sm">
                    FIFA World Cup 2026
                  </p>
                  <h2 className="text-2xl font-black md:text-3xl">
                    Join the Game
                  </h2>
                </div>
              </div>
              <p className="mb-5 text-sm font-semibold leading-relaxed text-slate-600">
                Sign in to play, save your score, and receive prize updates if you win.
              </p>
              <AuthButtons next="/game" />
              <p className="mt-4 rounded bg-slate-100 p-3 text-center text-xs font-bold text-slate-600">
                Your WhatsApp number is only used for prize notification.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-5 md:grid-cols-[0.85fr_1.15fr] md:gap-6 md:py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:gap-4">
          <StatCard label="当前阶段" value={round.labelCn} tone="green" />
          <StatCard label="正确得分" value={`${round.scoringPoints}分`} tone="gold" />
          <StatCard label="参赛玩家" value="1,280+" detail="Demo seed" />
          <StatCard label="邀请好友" value="人气榜" tone="navy" />
        </div>
        <LeaderboardTable players={profiles.slice(0, 4)} title="实时总榜" />
      </section>
      <LiveScoreboard />
      <section className="bg-white px-4 py-6 md:py-10">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {[
            ["预测晋级", "每场比赛选择你认为会晋级的球队。", Trophy],
            ["好友战队", "分享专属链接，把朋友拉进你的战区。", Share2],
            ["周边奖励", "总榜、每轮冠军和人气邀请王都有奖。", Gift],
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
