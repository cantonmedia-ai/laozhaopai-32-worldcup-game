import { AdminLayout } from "@/components/admin-layout";
import { LeaderboardTable, type LeaderboardRow } from "@/components/leaderboard";
import { SectionHeader } from "@/components/app-shell";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

type SupabaseLeaderboardRow = {
  profile_id: string;
  display_name: string;
  avatar_url?: string;
  total_score: number;
  round_score: number;
  correct_predictions: number;
  total_predictions: number;
  accuracy_rate: number;
  rank_position: number;
  previous_rank_position: number | null;
  invite_count: number;
};

function supabaseRowToRow(row: SupabaseLeaderboardRow): LeaderboardRow {
  return {
    id: row.profile_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    totalScore: row.total_score,
    roundScore: row.round_score,
    rank: row.rank_position,
    previousRank: row.previous_rank_position ?? undefined,
    correctPredictions: row.correct_predictions,
    totalPredictions: row.total_predictions,
    accuracyRate: Number(row.accuracy_rate),
    inviteCount: row.invite_count,
  };
}

async function loadLeaderboard() {
  if (!hasSupabaseServerEnv()) return [];

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_leaderboard", {
    p_game_id: null,
    p_round_id: null,
    p_scope: "overall",
  });

  return ((data ?? []) as SupabaseLeaderboardRow[]).map(supabaseRowToRow);
}

export default async function AdminLeaderboardsPage() {
  const rows = await loadLeaderboard();

  return (
    <AdminLayout active="/admin/leaderboards">
      <SectionHeader eyebrow="Leaderboards" title="排行榜管理" />
      <LeaderboardTable
        players={rows}
        emptyText="No signed-up players yet."
      />
    </AdminLayout>
  );
}
