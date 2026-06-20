import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { game } from "@/lib/demo-data";

export default function AdminGamesPage() {
  return (
    <AdminLayout active="/admin/games">
      <SectionHeader eyebrow="Campaign" title="Manage game campaign" />
      <div className="card max-w-3xl p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 font-bold">
            Name
            <input className="h-12 rounded border border-slate-200 px-3" defaultValue={game.name} />
          </label>
          <label className="grid gap-2 font-bold">
            Slug
            <input className="h-12 rounded border border-slate-200 px-3" defaultValue={game.slug} />
          </label>
          <label className="grid gap-2 font-bold">
            Status
            <select className="h-12 rounded border border-slate-200 px-3" defaultValue={game.status}>
              <option>draft</option>
              <option>active</option>
              <option>completed</option>
              <option>archived</option>
            </select>
          </label>
        </div>
      </div>
    </AdminLayout>
  );
}
