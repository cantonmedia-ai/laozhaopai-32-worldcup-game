import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";

const logs = [
  ["confirm_result", "matches", "Admin confirmed Match 1 result"],
  ["calculate_score", "predictions", "Scores rebuilt for r32"],
  ["assign_reward", "rewards", "Reward seed created"],
];

export default function AdminAuditPage() {
  return (
    <AdminLayout active="/admin/audit">
      <SectionHeader eyebrow="Audit" title="操作记录" />
      <div className="card overflow-hidden">
        {logs.map(([action, table, reason]) => (
          <div key={action} className="grid gap-1 border-b border-slate-100 px-5 py-4 last:border-b-0">
            <p className="font-black">{action}</p>
            <p className="text-sm text-slate-500">{table} · {reason}</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
