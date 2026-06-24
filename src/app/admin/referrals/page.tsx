import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import {
  createServiceClient,
  hasSupabaseServiceEnv,
} from "@/lib/supabase/service";

type ReferralRow = {
  id: string;
  referral_code: string | null;
  created_at: string;
  reward_status: string | null;
  referrer_profile_id: string | null;
  referred_profile_id: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  nickname: string | null;
  email: string | null;
};

type ReferralView = ReferralRow & {
  referrerName: string;
  referredName: string;
};

async function loadReferrals() {
  if (!hasSupabaseServiceEnv()) return { rows: [] as ReferralView[], error: "" };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("referrals")
      .select(
        "id, referral_code, created_at, reward_status, referrer_profile_id, referred_profile_id",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const referrals = (data ?? []) as ReferralRow[];
    const profileIds = [
      ...new Set(
        referrals
          .flatMap((row) => [row.referrer_profile_id, row.referred_profile_id])
          .filter(Boolean) as string[],
      ),
    ];

    const { data: profiles } = profileIds.length
      ? await supabase
          .from("profiles")
          .select("id, display_name, nickname, email")
          .in("id", profileIds)
      : { data: [] };

    const profileById = new Map(
      ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
    );

    const displayName = (id: string | null) => {
      const profile = id ? profileById.get(id) : null;
      return profile?.nickname || profile?.display_name || profile?.email || "Player";
    };

    return {
      rows: referrals.map((referral) => ({
        ...referral,
        referrerName: displayName(referral.referrer_profile_id),
        referredName: displayName(referral.referred_profile_id),
      })),
      error: "",
    };
  } catch (error) {
    return {
      rows: [] as ReferralView[],
      error:
        error instanceof Error
          ? error.message
          : "Unable to load live referrals.",
    };
  }
}

export default async function AdminReferralsPage() {
  const { rows, error } = await loadReferrals();

  return (
    <AdminLayout active="/admin/referrals">
      <SectionHeader eyebrow="Referrals" title="邀请关系" />
      {error ? (
        <div className="mb-4 rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
          {error}
        </div>
      ) : null}
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-5 text-sm font-bold text-slate-500">
            No live referral records yet.
          </p>
        ) : null}
        {rows.map((referral) => (
          <div
            key={referral.id}
            className="grid gap-1 border-b border-slate-100 px-5 py-4 last:border-b-0"
          >
            <p className="font-black">
              {referral.referrerName} invited {referral.referredName}
            </p>
            <p className="text-sm text-slate-500">
              {referral.referral_code || "-"} ·{" "}
              {new Date(referral.created_at).toLocaleString("zh-MY")} ·{" "}
              {referral.reward_status || "pending"}
            </p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
