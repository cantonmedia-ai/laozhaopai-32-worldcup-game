import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader, StatCard } from "@/components/app-shell";
import { matches, profiles, referrals, rewards, rounds } from "@/lib/demo-data";

export default function AdminPage() {
  return (
    <AdminLayout active="/admin">
      <SectionHeader
        eyebrow="Admin"
        title="Admin 后台管理"
        body="管理比赛、录入赛果、查看玩家、排行榜、邀请关系和奖品。"
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="比赛场次" value={matches.length} tone="navy" />
        <StatCard label="阶段" value={rounds.length} tone="green" />
        <StatCard label="玩家" value={profiles.filter((p) => p.role === "player").length} />
        <StatCard label="邀请关系" value={referrals.length} tone="gold" />
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-xl font-black">待处理赛果</h2>
          <div className="mt-4 grid gap-3">
            {matches.slice(0, 4).map((match) => (
              <div key={match.id} className="flex items-center justify-between rounded bg-slate-100 p-3">
                <span className="font-bold">Match {match.matchNo}</span>
                <span className="rounded bg-[#0f8a4b] px-2 py-1 text-xs font-black text-white">
                  {match.status}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-xl font-black">奖品状态</h2>
          <div className="mt-4 grid gap-3">
            {rewards.slice(0, 4).map((reward) => (
              <div key={reward.id} className="flex items-center justify-between rounded bg-slate-100 p-3">
                <span className="font-bold">{reward.rewardName}</span>
                <span className="text-sm font-black text-slate-500">{reward.claimStatus}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
