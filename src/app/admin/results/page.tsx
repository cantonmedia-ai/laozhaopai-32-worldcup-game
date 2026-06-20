import { AdminResultForm } from "@/components/admin-actions";
import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";

export default function AdminResultsPage() {
  return (
    <AdminLayout active="/admin/results">
      <SectionHeader
        eyebrow="Result Entry"
        title="结果录入"
        body="确认录入后，系统会计算所有玩家得分、更新排行榜并写入审计记录。"
      />
      <AdminResultForm />
    </AdminLayout>
  );
}
