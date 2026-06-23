import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Trophy,
  UsersRound,
} from "lucide-react";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { displayName, requireCompletedProfile } from "@/lib/auth-guards";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { stageInlineName } from "@/lib/stage-labels";

export const dynamic = "force-dynamic";

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
  predictionDueAt: string | null;
  openMatchCount: number;
  submittedPredictionCount: number;
  activeRoundKey: string | null;
  team: TeamSummary;
};

const gameCards = [
  {
    id: "game1",
    href: "/road-to-champion",
    title: "Game 1: Ultimate Predictor",
    english: "Ultimate Predictor",
    badge: "Open Now",
    body: "Predict which teams will reach the Sweet 16, Elite 8, Final 4, Grand Final, and champion. Submit before the prediction deadline to lock your answer.",
    cta: "Start Prediction",
    icon: Trophy,
    lockedWhenWaiting: false,
  },
];

type ProviderMatch = {
  utcDate?: string;
  stage?: string;
  status?: string;
};

function footballDataUrl(path: string) {
  const competition = process.env.FOOTBALL_DATA_COMPETITION ?? "WC";
  const season = process.env.FOOTBALL_DATA_SEASON ?? "2026";
  const baseUrl = process.env.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org";
  const url = new URL(`/v4/competitions/${competition}/${path}`, baseUrl);
  url.searchParams.set("season", season);
  return url;
}

function isRoundOf32Fixture(match: ProviderMatch) {
  const stage = String(match.stage ?? "").toUpperCase();
  return (
    stage.includes("LAST_32") ||
    stage.includes("ROUND_OF_32") ||
    stage.includes("ROUND OF 32")
  );
}

async function loadPredictionDeadlineFromFixtures() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(footballDataUrl("matches"), {
      headers: { "X-Auth-Token": apiKey },
      next: { revalidate: 900 },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { matches?: ProviderMatch[] };
    const firstKickoff = (data.matches ?? [])
      .filter(isRoundOf32Fixture)
      .map((match) => match.utcDate)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

    if (!firstKickoff) return null;

    return new Date(new Date(firstKickoff).getTime() - 15 * 60 * 1000).toISOString();
  } catch {
    return null;
  }
}

function formatDeadline(value: string | null) {
  if (!value) return "Deadline coming soon";
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(value));
}

function formatCountdown(value: string | null) {
  if (!value) return null;

  const remaining = new Date(value).getTime() - Date.now();
  if (remaining <= 0) return "Closed";

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

async function loadDashboardData(authUserId: string | null): Promise<DashboardData> {
  const emptyData: DashboardData = {
    myPoints: 0,
    myRank: null,
    topRows: [],
    predictionDueAt: null,
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
  const activeRoundKey = openMatches?.[0]?.round_key ?? null;
  const predictionDueAt = await loadPredictionDeadlineFromFixtures();

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
    predictionDueAt,
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
    predictionDueAt,
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
  const deadlineCountdown = formatCountdown(predictionDueAt);

  return (
    <PageShell active="/game">
      <main className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <SectionHeader
          eyebrow="Player Mission"
          title={`Welcome, ${profile ? displayName(profile) : "Player"}`}
          body="Submit your prediction before the Round of 32 begins."
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
            value={predictionDueAt ? formatDeadline(predictionDueAt) : "To be confirmed"}
            detail={
              predictionDueAt
                ? "15 minutes before Round of 32"
                : "Fixtures not published"
            }
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
                    <Icon size={14} /> {card.badge}
                  </span>
                  <h3 className="text-xl font-black text-slate-950">{card.title}</h3>
                  <p className="font-black text-[#d71920]">{card.english}</p>
                  <p className="mt-3 min-h-16 text-sm font-semibold text-slate-600">
                    {card.body}
                  </p>
                  <p className="mt-3 text-sm font-bold text-[#0f8a4b]">
                    Can play during Group Stage.
                  </p>
                  {locked ? (
                    <button
                      type="button"
                      disabled
                      className="mt-5 flex h-11 items-center justify-center gap-2 rounded bg-slate-300 px-4 font-black text-slate-600"
                    >
                      {card.cta}
                    </button>
                  ) : (
                    <Link
                      href={card.href}
                      className="mt-5 flex h-11 items-center justify-center gap-2 rounded bg-[#071525] px-4 font-black text-white hover:bg-slate-800"
                    >
                      {card.cta} <ArrowRight size={16} />
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
                <Clock size={16} /> Prediction Deadline
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Submit your prediction before the Round of 32 begins.
              </h2>
              {predictionDueAt ? (
                <div className="mt-2 max-w-3xl space-y-1 font-semibold text-white/85">
                  <p>Closes 15 minutes before the first Round of 32 match.</p>
                  <p>Deadline: {formatDeadline(predictionDueAt)}</p>
                  {deadlineCountdown ? <p>Closes in: {deadlineCountdown}</p> : null}
                </div>
              ) : (
                <div className="mt-2 max-w-3xl space-y-1 font-semibold text-white/85">
                  <p>Round of 32 fixtures are not confirmed yet.</p>
                  <p>
                    The deadline will be updated automatically once fixtures are
                    published.
                  </p>
                </div>
              )}
            </div>
            <Link
              href="/road-to-champion"
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded bg-white px-4 font-black text-[#071525]"
            >
              Continue Prediction <CheckCircle2 size={17} />
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
