import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { profiles } from "@/lib/demo-data";

export default function AdminPlayersPage() {
  return (
    <AdminLayout active="/admin/players">
      <SectionHeader eyebrow="Players" title="玩家管理" />
      <div className="card overflow-hidden">
        {profiles.map((profile) => (
          <div key={profile.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
            <div>
              <p className="font-black">{profile.displayName}</p>
              <p className="text-sm text-slate-500">{profile.role} · {profile.referralCode}</p>
            </div>
            <span className="font-black text-[#d71920]">{profile.totalScore}分</span>
            <button className="rounded bg-slate-100 px-3 py-2 text-sm font-black">View</button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
