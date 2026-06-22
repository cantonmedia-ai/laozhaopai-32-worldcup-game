import Link from "next/link";
import { LogOut, Settings, Share2 } from "lucide-react";
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
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="break-all font-black text-slate-950">
                {profile?.email ?? "-"}
              </p>
              <span
                className={`rounded px-2 py-1 text-[11px] font-black uppercase ${
                  profile?.email_verified === false
                    ? "bg-amber-100 text-amber-800"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {profile?.email_verified === false ? "Verify needed" : "Verified"}
              </span>
            </div>
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
          <Link
            href="/referral"
            className="flex h-12 items-center justify-center gap-2 rounded bg-[#0f8a4b] font-black text-white"
          >
            <Share2 size={18} /> Referral
          </Link>
          {profile && ["admin", "owner"].includes(profile.role) ? (
            <Link
              href="/admin"
              className="flex h-12 items-center justify-center gap-2 rounded bg-[#f4c542] font-black text-[#071525]"
            >
              <Settings size={18} /> Admin
            </Link>
          ) : null}
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-2 rounded bg-slate-200 font-black text-slate-800 hover:bg-slate-300"
            >
              <LogOut size={18} /> Logout
            </button>
          </form>
        </div>
      </main>
    </PageShell>
  );
}
