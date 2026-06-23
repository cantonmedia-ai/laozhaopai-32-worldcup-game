import { AdminLayout } from "@/components/admin-layout";
import { AdminPreLiveChecklist } from "@/components/admin-pre-live-checklist";
import { getPreLiveChecklist } from "@/lib/admin-pre-live-checklist";

export const dynamic = "force-dynamic";

export default async function AdminPreLiveChecklistPage() {
  const data = await getPreLiveChecklist();

  return (
    <AdminLayout active="/admin/pre-live-checklist">
      <AdminPreLiveChecklist data={data} />
    </AdminLayout>
  );
}
