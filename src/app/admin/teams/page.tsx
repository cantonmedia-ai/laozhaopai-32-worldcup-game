import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { teams } from "@/lib/demo-data";

export default function AdminTeamsPage() {
  return (
    <AdminLayout active="/admin/teams">
      <SectionHeader eyebrow="Teams" title="Manage teams" />
      <div className="card overflow-hidden">
        {teams.map((team) => (
          <div key={team.id} className="grid grid-cols-[64px_1fr_auto] items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0">
            <span className="text-3xl">{team.flag}</span>
            <div>
              <p className="font-black">{team.name}</p>
              <p className="text-sm text-slate-500">{team.shortName} · Group {team.groupName}</p>
            </div>
            <span className="font-black text-slate-500">Seed {team.seedNo}</span>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
