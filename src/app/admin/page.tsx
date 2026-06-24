import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader, StatCard } from "@/components/app-shell";
import {
  createServiceClient,
  hasSupabaseServiceEnv,
} from "@/lib/supabase/service";

type LiveMatchRow = {
  id: string;
  round_key: string;
  match_number: number;
  status: string;
  match_start_at: string;
  prediction_lock_at: string;
  team_a?: { country_name: string | null; country_code: string | null } | null;
  team_b?: { country_name: string | null; country_code: string | null } | null;
};

type RawLiveMatchRow = Omit<LiveMatchRow, "team_a" | "team_b"> & {
  team_a?: LiveMatchRow["team_a"] | LiveMatchRow["team_a"][];
  team_b?: LiveMatchRow["team_b"] | LiveMatchRow["team_b"][];
};

type RewardRow = {
  id: string;
  reward_name: string | null;
  claim_status: string | null;
};

type DashboardData = {
  matchCount: number;
  stageCount: number;
  playerCount: number;
  referralCount: number;
  pendingMatches: LiveMatchRow[];
  rewards: RewardRow[];
  error?: string;
};

async function countTable(table: string, filters?: (query: any) => any) {
  const supabase = createServiceClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (filters) query = filters(query);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function loadDashboard(): Promise<DashboardData> {
  if (!hasSupabaseServiceEnv()) {
    return {
      matchCount: 0,
      stageCount: 0,
      playerCount: 0,
      referralCount: 0,
      pendingMatches: [],
      rewards: [],
      error: "Supabase service is not configured.",
    };
  }

  try {
    const supabase = createServiceClient();
    const [matchCount, stageCount, playerCount, referralCount] =
      await Promise.all([
        countTable("knockout_matches"),
        countTable("prediction_stages"),
        countTable("profiles", (query) => query.eq("role", "player")),
        countTable("referrals"),
      ]);

    const { data: pendingMatches } = await supabase
      .from("knockout_matches")
      .select(
        "id, round_key, match_number, status, match_start_at, prediction_lock_at, team_a:teams!knockout_matches_team_a_id_fkey(country_name, country_code), team_b:teams!knockout_matches_team_b_id_fkey(country_name, country_code)",
      )
      .in("status", ["draft", "open", "locked"])
      .order("match_start_at", { ascending: true })
      .limit(5);

    const { data: rewards } = await supabase
      .from("rewards")
      .select("id, reward_name, claim_status")
      .order("created_at", { ascending: false })
      .limit(5);

    const liveMatches = ((pendingMatches ?? []) as RawLiveMatchRow[]).map(
      (match) => ({
        ...match,
        team_a: Array.isArray(match.team_a) ? match.team_a[0] : match.team_a,
        team_b: Array.isArray(match.team_b) ? match.team_b[0] : match.team_b,
      }),
    );

    return {
      matchCount,
      stageCount,
      playerCount,
      referralCount,
      pendingMatches: liveMatches,
      rewards: (rewards ?? []) as RewardRow[],
    };
  } catch (error) {
    return {
      matchCount: 0,
      stageCount: 0,
      playerCount: 0,
      referralCount: 0,
      pendingMatches: [],
      rewards: [],
      error:
        error instanceof Error
          ? error.message
          : "Unable to load live admin data.",
    };
  }
}

function teamName(team?: LiveMatchRow["team_a"]) {
  return team?.country_name || team?.country_code || "Waiting team";
}

export default async function AdminPage() {
  const data = await loadDashboard();

  return (
    <AdminLayout active="/admin">
      <SectionHeader
        eyebrow="Admin"
        title="Brainwave AI Admin Console"
        body="Live data from the FIFA game database. No demo records are shown here."
      />

      {data.error ? (
        <div className="mb-5 rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
          {data.error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Live Matches" value={data.matchCount} tone="navy" />
        <StatCard label="Game 1 Stages" value={data.stageCount} tone="green" />
        <StatCard label="Signed-up Players" value={data.playerCount} />
        <StatCard label="Referral Records" value={data.referralCount} tone="gold" />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-xl font-black">Pending / Open Matches</h2>
          <div className="mt-4 grid gap-3">
            {data.pendingMatches.length === 0 ? (
              <p className="rounded bg-slate-100 p-3 text-sm font-bold text-slate-500">
                No live match records yet.
              </p>
            ) : null}
            {data.pendingMatches.map((match) => (
              <div
                key={match.id}
                className="grid gap-1 rounded bg-slate-100 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold">
                    {match.round_key} Match {match.match_number}
                  </span>
                  <span className="rounded bg-[#0f8a4b] px-2 py-1 text-xs font-black text-white">
                    {match.status}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-600">
                  {teamName(match.team_a)} vs {teamName(match.team_b)}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Lock: {new Date(match.prediction_lock_at).toLocaleString("zh-MY")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-xl font-black">Prize Status</h2>
          <div className="mt-4 grid gap-3">
            {data.rewards.length === 0 ? (
              <p className="rounded bg-slate-100 p-3 text-sm font-bold text-slate-500">
                No live reward records yet.
              </p>
            ) : null}
            {data.rewards.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center justify-between rounded bg-slate-100 p-3"
              >
                <span className="font-bold">
                  {reward.reward_name || "Reward"}
                </span>
                <span className="text-sm font-black text-slate-500">
                  {reward.claim_status || "unclaimed"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
