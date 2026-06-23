import { Share2, UsersRound } from "lucide-react";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { CopyLinkButton } from "@/components/copy-link-button";
import { displayName, requireCompletedProfile } from "@/lib/auth-guards";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { teamInviteUrl, whatsappTeamInviteUrl } from "@/lib/team-invite";

type InviteRow = {
  id: string;
  created_at: string;
  profiles: {
    nickname: string | null;
    display_name: string | null;
    profile_completed: boolean | null;
  } | null;
};

type RawInviteRow = Omit<InviteRow, "profiles"> & {
  profiles:
    | InviteRow["profiles"]
    | InviteRow["profiles"][];
};

export default async function ReferralPage() {
  const profile = await requireCompletedProfile("/referral");
  const referralCode = profile?.referral_code ?? "";
  const referralLink = teamInviteUrl(referralCode);
  let invitedPlayers: InviteRow[] = [];

  if (hasSupabaseServerEnv() && profile) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("referrals")
      .select(
        "id, created_at, profiles:referred_profile_id(nickname, display_name, profile_completed)",
      )
      .eq("referrer_profile_id", profile.id)
      .order("created_at", { ascending: false });

    invitedPlayers = ((data ?? []) as RawInviteRow[]).map((row) => ({
      ...row,
      profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles,
    }));
  }

  return (
    <PageShell active="/referral">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <SectionHeader
          eyebrow="Referral"
          title="Invite Friends"
          body="Share your personal link. When a new player joins with your code, the system records that you invited them."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="My Code" value={referralCode} tone="gold" />
          <StatCard label="Invited Friends" value={invitedPlayers.length} tone="green" />
          <StatCard label="Player" value={profile ? displayName(profile) : "Player"} tone="navy" />
        </div>

        <section className="card mt-6 p-5">
          <div className="flex items-center gap-2">
            <UsersRound className="text-[#d71920]" />
            <h2 className="text-xl font-black text-slate-950">Your referral link</h2>
          </div>
          <p className="mt-4 break-all rounded bg-slate-100 p-3 text-sm font-bold text-slate-700">
            {referralLink}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CopyLinkButton value={referralLink} />
            <a
              href={whatsappTeamInviteUrl(referralLink)}
              className="flex h-12 items-center justify-center gap-2 rounded bg-[#0f8a4b] font-black text-white"
            >
              <Share2 size={18} /> Invite Teammate
            </a>
          </div>
        </section>

        <section className="card mt-6 overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-xl font-black text-slate-950">Invited players</h2>
          </div>
          {invitedPlayers.length ? (
            invitedPlayers.map((invite) => {
              const invited = invite.profiles;
              return (
                <div
                  key={invite.id}
                  className="grid gap-2 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-black text-slate-950">
                      {invited?.nickname || invited?.display_name || "Player setting up"}
                    </p>
                    <p className="text-sm font-semibold text-slate-500">
                      Joined {new Date(invite.created_at).toLocaleDateString("en-MY")}
                    </p>
                  </div>
                  <span className="rounded bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
                    {invited?.profile_completed ? "Ready" : "Profile setup"}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="px-5 py-8 text-center font-bold text-slate-500">
              No invited players yet. Share your link to start your team.
            </p>
          )}
        </section>
      </main>
    </PageShell>
  );
}
