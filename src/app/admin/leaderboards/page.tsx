import { AdminLayout } from "@/components/admin-layout";
import { LeaderboardTable } from "@/components/leaderboard";
import { SectionHeader } from "@/components/app-shell";
import { profiles } from "@/lib/demo-data";

export default function AdminLeaderboardsPage() {
  return (
    <AdminLayout active="/admin/leaderboards">
      <SectionHeader eyebrow="Leaderboards" title="排行榜管理" />
      <LeaderboardTable players={profiles.filter((p) => p.role === "player")} />
    </AdminLayout>
  );
}
