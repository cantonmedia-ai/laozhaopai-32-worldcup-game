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

type SquadMember = {
  relationship:
    | "my_team_owner"
    | "invited_by_me"
    | "team_i_joined"
    | "same_team_member";
  team_id: string;
  team_no: number;
  team_name: string;
  team_member_count: number;
  referral_code: string;
  total_score: number;
};

type DashboardData = {
  myPoints: number;
  myRank: number | null;
  topRows: RankingRow[];
  nextDeadline: string | null;
  openMatchCount: number;
  submittedPredictionCount: number;
  activeRoundKey: string | null;
  team: TeamSummary;
};

const gameCards = [
  {
    id: "game1",
    href: "/road-to-champion",
    title: "游戏 1：最强预测家",
    english: "Ultimate Predictor",
    badge: "开放中 / Open Now",
    body: "预测哪些球队可以进入16强、8强、4强、决赛和最终冠军。小组赛期间即可提交预测，截止后答案将锁定。",
    cta: "Start Game 1 / 开始预测",
    icon: Trophy,
    lockedWhenWaiting: false,
  },
  {
    id: "game2",
    href: "/predict",
    title: "游戏 2：个人淘汰赛赢家战",
    english: "Knockout Winner Challenge",
    badge: "等待32强名单 / Waiting for Round of 32",
    body: "32强名单确认后开放。玩家将预测每一场淘汰赛的赢家，猜中越多，积分越高。",
    cta: "Coming Soon / 即将开放",
    icon: ShieldCheck,
    lockedWhenWaiting: true,
  },
  {
    id: "game3",
    href: "/squad",
    title: "游戏 3：团队淘汰赛赢家战",
    english: "Team Knockout Winner Challenge",
    badge: "组队开放中 / Team Formation Open",
    body: "现在可以创建或加入团队。32强名单确认后，团队成员即可一起预测每场淘汰赛赢家，冲团队排行榜。",
    cta: "Create / Join Team / 创建或加入团队",
    icon: UsersRound,
    lockedWhenWaiting: false,
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
    activeRoundKey: null,
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
    .select("id, round_key, prediction_lock_at, status")
    .eq("status", "open")
    .gt("prediction_lock_at", new Date().toISOString())
    .order("prediction_lock_at", { ascending: true });

  const openMatchIds = (openMatches ?? []).map((match) => String(match.id));
  const nextDeadline = openMatches?.[0]?.prediction_lock_at ?? null;
  const activeRoundKey = openMatches?.[0]?.round_key ?? null;

  const { data: predictionRows } =
    authUserId && openMatchIds.length
      ? await supabase
          .from("solo_match_predictions")
          .select("match_id")
          .eq("user_id", authUserId)
          .in("match_id", openMatchIds)
      : { data: [] };

  let team: TeamSummary = null;
  if (authUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (profile?.id) {
      await supabase.rpc("get_or_create_open_squad_team", {
        p_owner_profile_id: profile.id,
      });
    }

    const { data: squadRows } = await supabase.rpc("get_my_squad");
    const squadMembers = (squadRows ?? []) as SquadMember[];
    const primaryMember =
      squadMembers.find((item) => item.relationship === "my_team_owner") ??
      squadMembers.find((item) => item.relationship === "team_i_joined") ??
      squadMembers[0];
    const sameTeam = primaryMember
      ? squadMembers.filter((item) => item.team_id === primaryMember.team_id)
      : [];

    if (primaryMember) {
      team = {
        name: primaryMember.team_name ?? `Team ${primaryMember.team_no}`,
        code: primaryMember.referral_code ?? "",
        totalPoints: sameTeam.reduce(
          (sum, item) => sum + Number(item.total_score ?? 0),
          0,
        ),
        members: Number(primaryMember.team_member_count ?? sameTeam.length),
      };
    }
  }

  return {
    myPoints,
    myRank,
    topRows: allRows.slice(0, 3),
    nextDeadline,
    openMatchCount: openMatchIds.length,
    submittedPredictionCount: predictionRows?.length ?? 0,
    activeRoundKey,
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
    activeRoundKey,
    team,
  } = await loadDashboardData(profile?.auth_user_id ?? null);
  const knockoutPublished = openMatchCount > 0 && Boolean(activeRoundKey);
  const currentStage = knockoutPublished
    ? stageInlineName(activeRoundKey)
    : "小组赛进行中 / Group Stage in Progress";
  const stagePrimary = knockoutPublished ? "32强生死战" : "小组赛进行中";
  const stageSecondary = knockoutPublished ? "Round of 32" : "Group Stage in Progress";
  const predictionComplete =
    openMatchCount > 0 && submittedPredictionCount >= openMatchCount;
  const predictionStatus = predictionComplete
    ? "Completed"
    : knockoutPublished
      ? "Not completed"
      : "Waiting for Round of 32";

  return (
    <PageShell active="/game">
      <main className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <SectionHeader
          eyebrow="Player Mission"
          title={`Welcome, ${profile ? displayName(profile) : "Player"}`}
          body="Start with Game 1 now, form a team, then come back when Round of 32 fixtures are confirmed."
        />

        <section className="overflow-hidden rounded-lg bg-[#071525] text-white shadow-sm">
          <div className="grid gap-5 p-5 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#f4c542]">
                {knockoutPublished ? "Current Active Round" : "Current Tournament Stage"}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
                {stagePrimary}
                <span className="block text-xl text-white/80 md:text-3xl">
                  {stageSecondary}
                </span>
              </h2>
            </div>
            <div className="grid gap-3">
              <Link
                href={knockoutPublished ? "/predict" : "/road-to-champion"}
                className="flex h-14 items-center justify-center gap-2 rounded bg-[#d71920] px-5 text-center font-black text-white shadow-lg shadow-red-950/30 hover:bg-red-700"
              >
                {knockoutPublished ? "Submit Prediction Now" : "Start Game 1 Now"}{" "}
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/squad"
                className="flex h-12 items-center justify-center gap-2 rounded bg-white px-5 text-center font-black text-[#071525] hover:bg-slate-100"
              >
                Create / Join Team <UsersRound size={18} />
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-4 md:grid-cols-5">
          <StatCard
            label={knockoutPublished ? "Current Active Round" : "Current Tournament Stage"}
            value={stagePrimary}
            detail={stageSecondary}
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
            detail={nextDeadline ? "Malaysia time" : "Round of 32 not published"}
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
              Tournament status: {currentStage}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {gameCards.map((card) => {
              const Icon = card.icon;
              const locked = card.lockedWhenWaiting && !knockoutPublished;
              const badge =
                card.id === "game2" && knockoutPublished
                  ? "开放中 / Open Now"
                  : card.id === "game3" && knockoutPublished
                    ? "组队与预测开放中 / Team Prediction Open"
                    : card.badge;
              const cta =
                card.id === "game2" && knockoutPublished
                  ? "Play Now / 开始预测"
                  : card.id === "game3" && knockoutPublished
                    ? "Team Prediction / 团队预测"
                    : card.cta;

              return (
                <div
                  key={card.href}
                  className={`card flex flex-col p-5 ${locked ? "opacity-80" : ""}`}
                >
                  <span
                    className={`mb-4 inline-flex w-fit items-center gap-2 rounded px-3 py-1 text-xs font-black ${
                      locked
                        ? "bg-slate-200 text-slate-700"
                        : "bg-[#f4c542] text-[#071525]"
                    }`}
                  >
                    <Icon size={14} /> {badge}
                  </span>
                  <h3 className="text-xl font-black text-slate-950">{card.title}</h3>
                  <p className="font-black text-[#d71920]">{card.english}</p>
                  <p className="mt-3 min-h-16 text-sm font-semibold text-slate-600">
                    {card.body}
                  </p>
                  <p className="mt-3 text-sm font-bold text-[#0f8a4b]">
                    {card.id === "game1"
                      ? "Can play during Group Stage."
                      : card.id === "game2"
                        ? knockoutPublished
                          ? `Current round: ${currentStage}`
                          : "Locked until Round of 32 fixtures are published."
                        : knockoutPublished
                          ? `Team prediction open: ${currentStage}`
                          : "Team formation open. Prediction waiting for Round of 32."}
                  </p>
                  {locked ? (
                    <button
                      type="button"
                      disabled
                      className="mt-5 flex h-11 items-center justify-center gap-2 rounded bg-slate-300 px-4 font-black text-slate-600"
                    >
                      {cta}
                    </button>
                  ) : (
                    <Link
                      href={card.href}
                      className="mt-5 flex h-11 items-center justify-center gap-2 rounded bg-[#071525] px-4 font-black text-white hover:bg-slate-800"
                    >
                      {cta} <ArrowRight size={16} />
                    </Link>
                  )}
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
                href="/squad"
                className="flex h-11 items-center justify-center rounded bg-[#d71920] px-4 font-black text-white"
              >
                Invite Friends
              </Link>
              <Link
                href="/squad"
                className="flex h-11 items-center justify-center rounded bg-[#071525] px-4 font-black text-white"
              >
                My Team
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
                [
                  "Next round status",
                  knockoutPublished
                    ? "Open now"
                    : "Round of 32 opens after admin publishes fixtures",
                ],
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
                Game 2 and Game 3 prediction will open only after Round of 32
                fixtures are detected and admin publishes them. Come back each
                round to collect more points.
              </p>
            </div>
            <Link
              href={knockoutPublished ? "/predict" : "/road-to-champion"}
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded bg-white px-4 font-black text-[#071525]"
            >
              {knockoutPublished ? "View Next Round Status" : "Play Game 1"}{" "}
              <CheckCircle2 size={17} />
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
