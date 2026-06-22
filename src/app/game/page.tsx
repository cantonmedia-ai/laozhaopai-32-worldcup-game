import Link from "next/link";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { displayName, requireCompletedProfile } from "@/lib/auth-guards";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import {
  knockoutWinnerDescription,
  knockoutWinnerNameCn,
  knockoutWinnerNameEn,
} from "@/lib/knockout-winner";

type RankingRow = {
  profile_id: string;
  display_name: string;
  total_score: number;
  rank_position: number;
};

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

async function loadDashboardData(authUserId: string | null) {
  if (!hasSupabaseServerEnv()) {
    return { myPoints: 0, myRank: null as number | null, topRows: [] as RankingRow[] };
  }

  const supabase = await createClient();
  const { data: pointRows } = authUserId
    ? await supabase
        .from("point_transactions")
        .select("points")
        .eq("user_id", authUserId)
    : { data: [] };
  const myPoints = (pointRows ?? []).reduce(
    (sum, row) => sum + Number(row.points ?? 0),
    0,
  );

  const { data: leaderboardRows } = await supabase.rpc("get_leaderboard", {
    p_game_id: null,
    p_round_id: null,
    p_scope: "overall",
  });
  const allRows = (leaderboardRows ?? []) as RankingRow[];
  const myRank =
    allRows.find((row) => row.profile_id === authUserId)?.rank_position ?? null;

  return { myPoints, myRank, topRows: allRows.slice(0, 3) };
}

export default async function GamePage() {
  const profile = await requireCompletedProfile("/game");
  const { myPoints, myRank, topRows } = await loadDashboardData(
    profile?.auth_user_id ?? null,
  );

  return (
    <PageShell active="/game">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <SectionHeader
          eyebrow="Player Dashboard"
          title={`Welcome, ${profile ? displayName(profile) : "Player"}`}
          body="Choose a game mode, submit before the due date, and climb the right ranking."
        />

        <div className="grid gap-4 md:grid-cols-5">
          <StatCard label="Current Stage" value="Last 32" tone="green" />
          <StatCard
            label="My Ranking"
            value={myRank ? `#${myRank}` : "-"}
            detail="Live ranking"
            tone="gold"
          />
          <StatCard label="My Squad" value="Team page" />
          <StatCard label="Total Points" value={myPoints} tone="navy" />
          <StatCard label="Next Due" value="Admin set" detail="Check game card" />
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
                Current active round: Last 32
              </p>
              <p className="text-sm font-bold text-slate-500">
                Open the game to submit or edit before lock time.
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-lg bg-white p-5">
          <h2 className="text-xl font-black">Top Ranking</h2>
          <div className="mt-4 grid gap-3">
            {topRows.length === 0 ? (
              <p className="rounded bg-slate-100 p-4 text-sm font-bold text-slate-600">
                No signed-up players yet.
              </p>
            ) : null}
            {topRows.map((player) => (
              <div
                key={player.profile_id}
                className="flex items-center justify-between rounded bg-slate-100 p-4"
              >
                <span className="font-black">
                  #{player.rank_position} {player.display_name}
                </span>
                <span className="font-black text-[#d71920]">
                  {player.total_score} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </PageShell>
  );
}
