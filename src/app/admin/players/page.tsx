import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

type PlayerRow = {
  id: string;
  auth_user_id: string;
  display_name: string | null;
  nickname: string | null;
  email: string | null;
  referral_code: string;
  profile_completed: boolean | null;
  created_at: string;
};

type PlayerWithScore = PlayerRow & {
  totalScore: number;
};

async function loadPlayers(): Promise<PlayerWithScore[]> {
  if (!hasSupabaseServerEnv()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, auth_user_id, display_name, nickname, email, referral_code, profile_completed, created_at",
    )
    .eq("role", "player")
    .eq("is_blocked", false)
    .order("created_at", { ascending: true });

  const players = (data ?? []) as PlayerRow[];
  const userIds = players.map((player) => player.auth_user_id);
  const { data: pointRows } = userIds.length
    ? await supabase
        .from("point_transactions")
        .select("user_id, points")
        .in("user_id", userIds)
    : { data: [] };
  const pointsByUserId = new Map<string, number>();
  (pointRows ?? []).forEach((row) => {
    const userId = String(row.user_id);
    pointsByUserId.set(
      userId,
      (pointsByUserId.get(userId) ?? 0) + Number(row.points ?? 0),
    );
  });

  return players.map((player) => ({
    ...player,
    totalScore: pointsByUserId.get(player.auth_user_id) ?? 0,
  }));
}

export default async function AdminPlayersPage() {
  const players = await loadPlayers();

  return (
    <AdminLayout active="/admin/players">
      <SectionHeader eyebrow="Players" title="玩家管理" />
      <div className="card overflow-hidden">
        {players.length === 0 ? (
          <p className="p-5 text-sm font-bold text-slate-500">
            No signed-up players yet.
          </p>
        ) : null}
        {players.map((profile) => {
          const name =
            profile.nickname || profile.display_name || profile.email || "Player";

          return (
            <div key={profile.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
              <div>
                <p className="font-black">{name}</p>
                <p className="text-sm text-slate-500">
                  {profile.profile_completed ? "Profile complete" : "Signed up"} · {profile.referral_code}
                </p>
              </div>
              <span className="font-black text-[#d71920]">{profile.totalScore}分</span>
              <span className="rounded bg-slate-100 px-3 py-2 text-sm font-black">
                View
              </span>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
