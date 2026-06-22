import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { EmailSettingsAdmin } from "@/components/email-settings-admin";
import { getEmailState } from "@/lib/email/data";

export default async function AdminEmailSettingsPage() {
  const state = await getEmailState();

  return (
    <AdminLayout active="/admin/email-settings">
      <SectionHeader
        eyebrow="Brainwave AI Admin Console"
        title="Email Automation Settings"
        body="Manage verification emails, reminders, round notifications and winner emails."
      />
      <EmailSettingsAdmin initialState={state} />
    </AdminLayout>
  );
}
