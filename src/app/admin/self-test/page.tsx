import { AdminLayout } from "@/components/admin-layout";
import { AdminSelfTestChecklist } from "@/components/admin-self-test-checklist";

export default function AdminSelfTestPage() {
  return (
    <AdminLayout active="/admin/self-test">
      <AdminSelfTestChecklist />
    </AdminLayout>
  );
}
