import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { displayName, requireCompletedProfile } from "@/lib/auth-guards";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import {
  knockoutWinnerNameCn,
  knockoutWinnerNameEn,
} from "@/lib/knockout-winner";
import { stageInlineName } from "@/lib/stage-labels";

type RankingRow = {
  profile_id: string;
  display_name: string;
  total_score: number;
  rank_position: number;
};

type TeamSummary = {
  name: string;
  code: string;
  totalPoints: number;
  members: number;
} | null;

type DashboardData = {
  myPoints: number;
  myRank: number | null;
  topRows: RankingRow[];
  nextDeadline: string | null;
  openMatchCount: number;
  submittedPredictionCount: number;
  team: TeamSummary;
};

const currentStage = stageInlineName("last_32");

const gameCards = [
  {
    href: "/predict",
    title: knockoutWinnerNameCn,
    english: knockoutWinnerNameEn,
    body: "Pick the winner of each knockout match.",
    cta: "Play Now",
    icon: ShieldCheck,
  },
  {
    href: "/team-knockout",
    title: "团队淘汰赛赢家战",
    english: "Team Knockout Winner Challenge",
    body: "Create or join a team and compete with friends.",
    cta: "Create / Join Team",
    icon: UsersRound,
  },
  {
    href: "/road-to-champion",
    title: "最强预测家",
    english: "Ultimate Predictor",
    body: "Predict which teams reach each stage and who becomes champion.",
    cta: "Submit Prediction",
    icon: Trophy,
  },
];

function formatDeadline(value: string | null) {
  if (!value) return "Deadline coming soon";
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(value));
}

async function loadDashboardData(authUserId: string | null): Promise<DashboardData> {
  const emptyData: DashboardData = {
    myPoints: 0,
    myRank: null,
    topRows: [],
    nextDeadline: null,
    openMatchCount: 0,
    submittedPredictionCount: 0,
    team: null,
  };

  if (!hasSupabaseServerEnv()) return emptyData;

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

  const { data: openMatches } = await supabase
    .from("knockout_matches")
    .select("id, prediction_lock_at, status")
    .in("status", ["open", "draft"])
    .gt("prediction_lock_at", new Date().toISOString())
    .order("prediction_lock_at", { ascending: true });

  const openMatchIds = (openMatches ?? []).map((match) => String(match.id));
  const nextDeadline = openMatches?.[0]?.prediction_lock_at ?? null;

  const { data: predictionRows } =
    authUserId && openMatchIds.length
      ? await supabase
          .from("solo_match_predictions")
          .select("match_id")
          .eq("user_id", authUserId)
          .in("match_id", openMatchIds)
      : { data: [] };

  const { data: member } = authUserId
    ? await supabase
        .from("game_team_members")
        .select("team_id, game_teams(team_name, team_code)")
        .eq("user_id", authUserId)
        .eq("status", "active")
        .maybeSingle()
    : { data: null };

  let team: TeamSummary = null;
  if (member?.team_id) {
    const gameTeam = Array.isArray(member.game_teams)
      ? member.game_teams[0]
      : member.game_teams;
    const { data: summary } = await supabase
      .from("team_score_summary")
      .select("total_points, active_member_count")
      .eq("team_id", member.team_id)
      .maybeSingle();
    team = {
      name: gameTeam?.team_name ?? "My Team",
      code: gameTeam?.team_code ?? "",
      totalPoints: Number(summary?.total_points ?? 0),
      members: Number(summary?.active_member_count ?? 0),
    };
  }

  return {
    myPoints,
    myRank,
    topRows: allRows.slice(0, 3),
    nextDeadline,
    openMatchCount: openMatchIds.length,
    submittedPredictionCount: predictionRows?.length ?? 0,
    team,
  };
}

export default async function GamePage() {
  const profile = await requireCompletedProfile("/game");
  const {
    myPoints,
    myRank,
    topRows,
    nextDeadline,
    openMatchCount,
    submittedPredictionCount,
    team,
  } = await loadDashboardData(profile?.auth_user_id ?? null);
  const predictionComplete =
    openMatchCount > 0 && submittedPredictionCount >= openMatchCount;
  const predictionStatus = predictionComplete
    ? "Completed"
    : openMatchCount > 0
      ? "Not completed"
      : "Waiting for matches";

  return (
    <PageShell active="/game">
      <main className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <SectionHeader
          eyebrow="Player Mission"
          title={`Welcome, ${profile ? displayName(profile) : "Player"}`}
          body="Start with your prediction, form a team, then come back every round to collect more points."
        />

        <section className="overflow-hidden rounded-lg bg-[#071525] text-white shadow-sm">
          <div className="grid gap-5 p-5 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#f4c542]">
                Current Open Round
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
                32强生死战
                <span className="block text-xl text-white/80 md:text-3xl">
                  Round of 32
                </span>
              </h2>
              <div className="mt-4 grid gap-2 text-sm font-bold text-white/75 sm:grid-cols-2">
                <p className="rounded bg-white/10 p-3">
                  Status: {openMatchCount ? "Open Now" : "Coming Soon"}
                </p>
                <p className="rounded bg-white/10 p-3">
                  Deadline: {formatDeadline(nextDeadline)}
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              <Link
                href="/predict"
                className="flex h-14 items-center justify-center gap-2 rounded bg-[#d71920] px-5 text-center font-black text-white shadow-lg shadow-red-950/30 hover:bg-red-700"
              >
                Submit Prediction Now <ArrowRight size={18} />
              </Link>
              <Link
                href="/team-knockout"
                className="flex h-12 items-center justify-center gap-2 rounded bg-white px-5 text-center font-black text-[#071525] hover:bg-slate-100"
              >
                Create / Join Team <UsersRound size={18} />
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-4 md:grid-cols-5">
          <StatCard
            label="Current Stage"
            value="32强生死战"
            detail="Round of 32"
            tone="green"
          />
          <StatCard
            label="My Ranking"
            value={myRank ? `#${myRank}` : "Enter ranking"}
            detail={myRank ? "Live ranking" : "Complete prediction first"}
            tone="gold"
          />
          <StatCard
            label="My Team"
            value={team ? team.name : "No team yet"}
            detail={team ? `${team.members} members` : "Create / join team"}
          />
          <StatCard label="Total Points" value={myPoints} tone="navy" />
          <StatCard
            label="Next Due"
            value={nextDeadline ? formatDeadline(nextDeadline) : "Coming soon"}
            detail={nextDeadline ? "Malaysia time" : "Deadline coming soon"}
          />
        </div>

        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#0f8a4b]">
                Choose What To Play
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Start here
              </h2>
            </div>
            <p className="text-sm font-bold text-slate-500">
              Current round: {currentStage}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {gameCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.href} className="card flex flex-col p-5">
                  <span className="mb-4 inline-flex w-fit items-center gap-2 rounded bg-[#f4c542] px-3 py-1 text-xs font-black text-[#071525]">
                    <Icon size={14} /> Prize Game
                  </span>
                  <h3 className="text-xl font-black text-slate-950">{card.title}</h3>
                  <p className="font-black text-[#d71920]">{card.english}</p>
                  <p className="mt-3 min-h-12 text-sm font-semibold text-slate-600">
                    {card.body}
                  </p>
                  <p className="mt-3 text-sm font-bold text-[#0f8a4b]">
                    Current round: {currentStage}
                  </p>
                  <Link
                    href={card.href}
                    className="mt-5 flex h-11 items-center justify-center gap-2 rounded bg-[#071525] px-4 font-black text-white hover:bg-slate-800"
                  >
                    {card.cta} <ArrowRight size={16} />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="card p-5">
            <h2 className="text-2xl font-black text-slate-950">
              {team ? "Your Team" : "Form Your Team"}
            </h2>
            {team ? (
              <div className="mt-4 grid gap-3 text-sm font-bold text-slate-700">
                <p className="rounded bg-slate-100 p-3">Team name: {team.name}</p>
                <p className="rounded bg-slate-100 p-3">
                  Members: {team.members} · Team points: {team.totalPoints}
                </p>
                <p className="rounded bg-slate-100 p-3">Invite code: {team.code}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold text-slate-600">
                Create a team or join your friend&apos;s team. Team points help
                you compete on the team leaderboard.
              </p>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/team-knockout"
                className="flex h-11 items-center justify-center rounded bg-[#d71920] px-4 font-black text-white"
              >
                Create Team
              </Link>
              <Link
                href="/team-knockout"
                className="flex h-11 items-center justify-center rounded bg-[#071525] px-4 font-black text-white"
              >
                Join Team
              </Link>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-2xl font-black text-slate-950">My Progress</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Prediction status", predictionStatus],
                ["Team status", team ? "Joined" : "Not joined"],
                ["Total points", `${myPoints}`],
                ["Ranking", myRank ? `#${myRank}` : "Complete prediction to enter ranking"],
                ["Next round status", openMatchCount ? "Open now" : "Will open after admin confirms teams"],
              ].map(([label, value]) => (
                <div key={label} className="rounded bg-slate-100 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1 font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg bg-[#0f8a4b] p-5 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-black text-white/75">
                <Clock size={16} /> Come Back Reminder
              </p>
              <h2 className="mt-2 text-2xl font-black">
                This challenge continues until the Grand Final.
              </h2>
              <p className="mt-2 max-w-3xl font-semibold text-white/85">
                Every new round will open after admin confirms the teams. Come
                back each round to submit new predictions and collect more points.
              </p>
            </div>
            <Link
              href="/predict"
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded bg-white px-4 font-black text-[#071525]"
            >
              View Next Round Status <CheckCircle2 size={17} />
            </Link>
          </div>
        </section>

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
