import Link from "next/link";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { displayName, requireCompletedProfile } from "@/lib/auth-guards";

export default async function ProfilePage() {
  const profile = await requireCompletedProfile("/profile");
  const whatsapp =
    profile?.whatsapp_number || profile?.phone_number || profile?.phone || "";

  return (
    <PageShell active="/profile">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <SectionHeader
          eyebrow="Profile"
          title="My Account"
          body="Your player profile is used for ranking, referrals, and prize notification."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Player Name" value={profile ? displayName(profile) : "Player"} tone="gold" />
          <StatCard label="Referral Code" value={profile?.referral_code ?? "-"} tone="green" />
        </div>

        <div className="card mt-6 grid gap-4 p-5">
          <div>
            <p className="text-sm font-black text-slate-500">Email</p>
            <p className="mt-1 break-all font-black text-slate-950">
              {profile?.email ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-sm font-black text-slate-500">WhatsApp Number</p>
            <p className="mt-1 font-black text-slate-950">{whatsapp || "-"}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              WhatsApp number is only used for prize notification.
            </p>
          </div>
          <Link
            href="/profile-setup?next=/profile"
            className="flex h-12 items-center justify-center rounded bg-[#071525] font-black text-white"
          >
            Update Profile
          </Link>
        </div>
      </main>
    </PageShell>
  );
}
