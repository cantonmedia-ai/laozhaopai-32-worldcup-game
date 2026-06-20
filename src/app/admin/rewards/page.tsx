import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { AdminRewardCards } from "@/components/admin-actions";

export default function AdminRewardsPage() {
  return (
    <AdminLayout active="/admin/rewards">
      <SectionHeader eyebrow="Rewards" title="奖品管理" />
      <AdminRewardCards />
    </AdminLayout>
  );
}
