import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { PageShell, SectionHeader } from "@/components/app-shell";
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

type DashboardData = {
  topRows: RankingRow[];
  predictionDueAt: string | null;
  openMatchCount: number;
  submittedPredictionCount: number;
  activeRoundKey: string | null;
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
  {
    id: "game2",
    href: "/predict",
    title: "Game 2: Knockout Winner Challenge",
    english: "淘汰赛赢家战",
    badge: "Opens after Round of 32",
    body: "Predict the winner for each knockout match once Round of 32 fixtures are published.",
    cta: "View Game 2",
    icon: ShieldCheck,
    lockedWhenWaiting: true,
  },
  {
    id: "game3",
    href: "/team-knockout",
    title: "Game 3: Team Knockout Winner Challenge",
    english: "团队淘汰赛赢家战",
    badge: "Team Formation Open",
    body: "Form your team now. Team winner predictions open after Round of 32 fixtures are published.",
    cta: "View Game 3",
    icon: UsersRound,
    lockedWhenWaiting: true,
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
    topRows: [],
    predictionDueAt: null,
    openMatchCount: 0,
    submittedPredictionCount: 0,
    activeRoundKey: null,
  };

  if (!hasSupabaseServerEnv()) return emptyData;

  const supabase = await createClient();
  const { data: leaderboardRows } = await supabase.rpc("get_leaderboard", {
    p_game_id: null,
    p_round_id: null,
    p_scope: "overall",
  });
  const allRows = (leaderboardRows ?? []) as RankingRow[];

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

  return {
    topRows: allRows.slice(0, 3),
    predictionDueAt,
    openMatchCount: openMatchIds.length,
    submittedPredictionCount: predictionRows?.length ?? 0,
    activeRoundKey,
  };
}

export default async function GamePage() {
  const profile = await requireCompletedProfile("/game");
  const {
    topRows,
    predictionDueAt,
    openMatchCount,
    submittedPredictionCount,
    activeRoundKey,
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
                    {card.id === "game1"
                      ? "Can play during Group Stage."
                      : knockoutPublished
                        ? `Current active round: ${currentStage}`
                        : "Waiting for Round of 32 fixtures."}
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
