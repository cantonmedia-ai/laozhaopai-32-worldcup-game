import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { rewards } from "@/lib/demo-data";

export default function AdminRewardsPage() {
  return (
    <AdminLayout active="/admin/rewards">
      <SectionHeader eyebrow="Rewards" title="奖品管理" />
      <div className="grid gap-4 md:grid-cols-2">
        {rewards.map((reward) => (
          <div key={reward.id} className="card p-5">
            <p className="font-black">{reward.rewardName}</p>
            <p className="mt-1 text-sm text-slate-500">{reward.rankType}</p>
            <button className="mt-4 rounded bg-[#071525] px-4 py-2 text-sm font-black text-white">
              Mark claimed
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
