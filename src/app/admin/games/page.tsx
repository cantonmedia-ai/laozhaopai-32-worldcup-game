import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { AdminCampaignForm } from "@/components/admin-actions";
import { game } from "@/lib/demo-data";

export default function AdminGamesPage() {
  return (
    <AdminLayout active="/admin/games">
      <SectionHeader eyebrow="Campaign" title="Manage game campaign" />
      <AdminCampaignForm game={game} />
    </AdminLayout>
  );
}
