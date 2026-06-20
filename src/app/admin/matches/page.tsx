import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { FlagChip } from "@/components/team-flag";
import { getTeam, matches } from "@/lib/demo-data";

export default function AdminMatchesPage() {
  return (
    <AdminLayout active="/admin/matches">
      <SectionHeader eyebrow="Matches" title="比赛管理" />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="p-4">No.</th>
              <th className="p-4">Team A</th>
              <th className="p-4">Team B</th>
              <th className="p-4">Deadline</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.id} className="border-t border-slate-100">
                <td className="p-4 font-black">{match.matchNo}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <FlagChip team={getTeam(match.teamAId)} />
                    <span>{getTeam(match.teamAId).name}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <FlagChip team={getTeam(match.teamBId)} />
                    <span>{getTeam(match.teamBId).name}</span>
                  </div>
                </td>
                <td className="p-4">{new Date(match.predictionDeadline).toLocaleString("zh-MY")}</td>
                <td className="p-4 font-black text-[#0f8a4b]">{match.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
