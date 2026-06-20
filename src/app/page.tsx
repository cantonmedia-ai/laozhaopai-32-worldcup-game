import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift, Medal, Share2, Trophy } from "lucide-react";
import { AuthButtons } from "@/components/auth-buttons";
import { LeaderboardTable } from "@/components/leaderboard";
import { PageShell, StatCard } from "@/components/app-shell";
import { TeamFlag } from "@/components/team-flag";
import { getCurrentRound, profiles, teams } from "@/lib/demo-data";

export default function Home() {
  const round = getCurrentRound();

  return (
    <PageShell active="/">
      <section className="stadium-hero relative overflow-hidden text-white">
        <Image
          src="/assets/elements/png/confetti_strip.png"
          alt=""
          width={1200}
          height={260}
          className="pointer-events-none absolute inset-x-0 top-0 h-32 w-full object-cover opacity-65"
          priority
        />
        <div className="mx-auto grid min-h-[86vh] max-w-7xl items-center gap-8 px-4 py-12 md:grid-cols-[1.1fr_0.9fr]">
          <div className="relative z-10">
            <p className="mb-4 inline-flex rounded bg-[#f4c542] px-3 py-1 text-sm font-black text-[#071525]">
              Lao Zhao Pai · Champion Prediction
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-tight md:text-7xl">
              老招牌 32强冠军竞猜赛
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-semibold text-white/85">
              预测王之战，谁是冠军预言家？从32强一路猜到决赛，每一轮揭晓都会更新排行榜。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login?next=/predict"
                className="inline-flex h-13 items-center justify-center gap-2 rounded bg-[#d71920] px-6 font-black text-white shadow-lg shadow-red-950/30 hover:bg-red-700"
              >
                立即参加 <ArrowRight size={18} />
              </Link>
              <Link
                href="/rules"
                className="inline-flex h-13 items-center justify-center rounded border border-white/30 px-6 font-black text-white hover:bg-white/10"
              >
                查看规则
              </Link>
            </div>
            <div className="mt-8 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
              {["32强开始", "16强对决", "8强争夺", "决赛之夜"].map(
                (stage) => (
                  <div
                    key={stage}
                    className="rounded border border-white/15 bg-white/10 p-3 text-center text-sm font-black backdrop-blur"
                  >
                    {stage}
                  </div>
                ),
              )}
            </div>
            <div className="mt-6 flex max-w-3xl gap-3 overflow-x-auto pb-2 scrollbar-clean">
              {teams.slice(0, 10).map((team) => (
                <div
                  key={team.id}
                  className="w-24 shrink-0 rounded bg-white/10 p-2 backdrop-blur"
                >
                  <TeamFlag team={team} className="h-14 w-full" />
                  <p className="mt-2 truncate text-center text-xs font-black text-white">
                    {team.shortName}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10">
            <div className="card bg-white/95 p-5 text-slate-950">
              <div className="mb-4 flex items-center gap-3">
                <Image
                  src="/assets/elements/png/gold_trophy_badge.png"
                  alt="Trophy"
                  width={82}
                  height={82}
                />
                <div>
                  <p className="text-sm font-black text-[#0f8a4b]">
                    当前阶段
                  </p>
                  <h2 className="text-3xl font-black">{round.labelCn}</h2>
                </div>
              </div>
              <AuthButtons next="/predict" />
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="当前阶段" value={round.labelCn} tone="green" />
          <StatCard label="正确得分" value={`${round.scoringPoints}分`} tone="gold" />
          <StatCard label="参赛玩家" value="1,280+" detail="Demo seed" />
          <StatCard label="邀请好友" value="人气榜" tone="navy" />
        </div>
        <LeaderboardTable players={profiles.slice(0, 4)} title="实时总榜" />
      </section>
      <section className="bg-white px-4 py-10">
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
