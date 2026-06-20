import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { profiles, referrals } from "@/lib/demo-data";

function name(id: string) {
  return profiles.find((profile) => profile.id === id)?.displayName ?? id;
}

export default function AdminReferralsPage() {
  return (
    <AdminLayout active="/admin/referrals">
      <SectionHeader eyebrow="Referrals" title="邀请关系" />
      <div className="card overflow-hidden">
        {referrals.map((referral) => (
          <div key={`${referral.referrerProfileId}-${referral.referredProfileId}`} className="grid gap-1 border-b border-slate-100 px-5 py-4 last:border-b-0">
            <p className="font-black">{name(referral.referrerProfileId)} invited {name(referral.referredProfileId)}</p>
            <p className="text-sm text-slate-500">{referral.referralCode} · {new Date(referral.createdAt).toLocaleString("zh-MY")}</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
