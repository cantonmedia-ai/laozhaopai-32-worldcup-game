import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { AdminRewardCards } from "@/components/admin-actions";

export default function AdminRewardsPage() {
  return (
    <AdminLayout active="/admin/rewards">
      <SectionHeader
        eyebrow="Prize Setting"
        title="淘汰赛赢家战奖品设置"
        body="Prize setting for Knockout Winner Challenge Ranking."
      />
      <AdminRewardCards />
    </AdminLayout>
  );
}
