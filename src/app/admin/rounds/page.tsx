import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { rounds } from "@/lib/demo-data";

export default function AdminRoundsPage() {
  return (
    <AdminLayout active="/admin/rounds">
      <SectionHeader eyebrow="Rounds" title="Manage stages" />
      <div className="grid gap-4 md:grid-cols-2">
        {rounds.map((round) => (
          <div key={round.id} className="card p-5">
            <p className="text-sm font-black text-[#0f8a4b]">{round.name}</p>
            <h2 className="mt-1 text-2xl font-black">{round.labelCn}</h2>
            <p className="mt-2 font-semibold text-slate-600">{round.scoringPoints} points · {round.status}</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
