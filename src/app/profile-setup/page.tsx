import { Suspense } from "react";
import { PageShell, SectionHeader } from "@/components/app-shell";
import { SetupProfileForm } from "@/components/setup-profile-form";

export default function ProfileSetupPage() {
  return (
    <PageShell active="/profile">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <SectionHeader
          eyebrow="First Login"
          title="Set Your Player Name"
          body="Choose your nickname and add your WhatsApp number so we can contact you if you win a prize."
        />
        <Suspense
          fallback={
            <div className="card p-5 font-bold text-slate-600">
              Loading profile form...
            </div>
          }
        >
          <SetupProfileForm />
        </Suspense>
      </main>
    </PageShell>
  );
}
