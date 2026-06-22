import Link from "next/link";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { getCurrentRound, getMe, profiles } from "@/lib/demo-data";
import { displayName, requireCompletedProfile } from "@/lib/auth-guards";
import { rankingMovement } from "@/lib/scoring";

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
          body="Check your game progress, enter Last 32 picks, invite friends, and follow the ranking."
        />

        <div className="grid gap-4 md:grid-cols-5">
          <StatCard label="Current Stage" value={round.labelCn} tone="green" />
          <StatCard label="My Ranking" value={`#${me.rank}`} detail={rankingMovement(me)} tone="gold" />
          <StatCard label="My Squad" value="2 friends" />
          <StatCard label="Total Points" value={me.totalScore} tone="navy" />
          <StatCard label="Pick Deadline" value="July 1" detail="12:00 PM" />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["/road-to-champion", "Road to Champion", "Predict Last 16, Last 8, Finalists, and Champion."],
            ["/predict", "Last 32 Seats", "Pick your winners and guess scores."],
            ["/leaderboard", "Ranking", "See overall, round, friend, and invite rankings."],
            ["/referral", "Referral", "Copy your invite link and build your squad."],
          ].map(([href, title, body]) => (
            <Link key={href} href={href} className="card p-5 transition hover:-translate-y-1">
              <h2 className="text-xl font-black text-slate-950">{title}</h2>
              <p className="mt-2 text-slate-600">{body}</p>
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
