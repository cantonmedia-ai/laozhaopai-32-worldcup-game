import Link from "next/link";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { getCurrentRound, getMe, profiles } from "@/lib/demo-data";
import { displayName, requireCompletedProfile } from "@/lib/auth-guards";
import {
  knockoutWinnerDescription,
  knockoutWinnerNameCn,
  knockoutWinnerNameEn,
} from "@/lib/knockout-winner";
import { rankingMovement } from "@/lib/scoring";

const gameCards = [
  {
    href: "/road-to-champion",
    title: "最强预测家",
    english: "Ultimate Predictor",
    body: "猜16强、8强、4强，预测最终冠军。",
  },
  {
    href: "/predict",
    title: knockoutWinnerNameCn,
    english: knockoutWinnerNameEn,
    body: knockoutWinnerDescription,
  },
  {
    href: "/team-knockout",
    title: "团队淘汰赛赢家战",
    english: "Team Knockout Winner Challenge",
    body: "加入团队一起预测每一轮赢家，团队积分冲榜赢大奖。",
  },
];

export default async function GamePage() {
  const profile = await requireCompletedProfile("/game");
  const me = getMe();
  const round = getCurrentRound();

  return (
    <PageShell active="/game">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <SectionHeader
          eyebrow="Player Dashboard"
          title={`Welcome, ${profile ? displayName(profile) : me.displayName}`}
          body="Choose a game mode, submit before the due date, and climb the right ranking."
        />

        <div className="grid gap-4 md:grid-cols-5">
          <StatCard label="Current Stage" value={round.labelCn} tone="green" />
          <StatCard label="My Ranking" value={`#${me.rank}`} detail={rankingMovement(me)} tone="gold" />
          <StatCard label="My Squad" value="2 friends" />
          <StatCard label="Total Points" value={me.totalScore} tone="navy" />
          <StatCard label="Next Due" value="July 1" detail="12:00 PM" />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {gameCards.map((card) => (
            <Link key={card.href} href={card.href} className="card p-5 transition hover:-translate-y-1">
              <span className="mb-3 inline-flex rounded bg-[#f4c542] px-3 py-1 text-xs font-black text-[#071525]">
                Prize Badge
              </span>
              <h2 className="text-xl font-black text-slate-950">{card.title}</h2>
              <p className="font-black text-[#d71920]">{card.english}</p>
              <p className="mt-2 text-slate-600">{card.body}</p>
              <p className="mt-4 text-sm font-bold text-[#0f8a4b]">
                Current active round: {round.labelCn}
              </p>
              <p className="text-sm font-bold text-slate-500">
                Predictions submitted: demo · Ranking teaser: #{me.rank}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-lg bg-white p-5">
          <h2 className="text-xl font-black">Top Ranking</h2>
          <div className="mt-4 grid gap-3">
            {profiles.slice(0, 3).map((player) => (
              <div key={player.id} className="flex items-center justify-between rounded bg-slate-100 p-4">
                <span className="font-black">#{player.rank} {player.displayName}</span>
                <span className="font-black text-[#d71920]">{player.totalScore} pts</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </PageShell>
  );
}
