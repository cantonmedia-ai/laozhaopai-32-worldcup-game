import Link from "next/link";
import { LogOut, Share2 } from "lucide-react";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { displayName, requireCompletedProfile } from "@/lib/auth-guards";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

type PlayerScoreSummary = {
  game1_individual_score: number;
  game1_team_accumulated_score: number;
  game1_final_earned_score: number;
  game2_individual_score: number;
  game2_team_accumulated_score: number;
  game2_final_earned_score: number;
  individual_final_score: number;
};

const emptyScoreSummary: PlayerScoreSummary = {
  game1_individual_score: 0,
  game1_team_accumulated_score: 0,
  game1_final_earned_score: 0,
  game2_individual_score: 0,
  game2_team_accumulated_score: 0,
  game2_final_earned_score: 0,
  individual_final_score: 0,
};

function ScoreLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded bg-slate-100 px-3 py-2">
      <span className="text-sm font-black text-slate-600">{label}</span>
      <span className={strong ? "text-xl font-black text-[#d71920]" : "font-black text-slate-950"}>
        {value}
      </span>
    </div>
  );
}

export default async function ProfilePage() {
  const profile = await requireCompletedProfile("/profile");
  const whatsapp =
    profile?.whatsapp_number || profile?.phone_number || profile?.phone || "";
  const isAdmin = profile ? ["admin", "owner"].includes(profile.role) : false;
  let scoreSummary = emptyScoreSummary;

  if (hasSupabaseServerEnv() && profile?.id) {
    const supabase = await createClient();
    await supabase.rpc("rebuild_final_score_summaries");
    const { data } = await supabase
      .from("player_score_summaries")
      .select(
        "game1_individual_score, game1_team_accumulated_score, game1_final_earned_score, game2_individual_score, game2_team_accumulated_score, game2_final_earned_score, individual_final_score",
      )
      .eq("profile_id", profile.id)
      .maybeSingle();

    scoreSummary = (data as PlayerScoreSummary | null) ?? emptyScoreSummary;
  }

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

        <div className="card mt-6 grid gap-3 p-5">
          <div>
            <h2 className="text-xl font-black text-slate-950">Score Summary</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Your Individual Final Score = Game 1 Final Earned Score + Game 2 Final Earned Score.
            </p>
          </div>
          <ScoreLine label="Game 1 个人分 / Game 1 Individual Score" value={scoreSummary.game1_individual_score} />
          <ScoreLine label="Game 1 团队累计分 / Game 1 Team Accumulated Score" value={scoreSummary.game1_team_accumulated_score} />
          <ScoreLine label="Game 1 最终获得分 / Game 1 Final Earned Score" value={scoreSummary.game1_final_earned_score} />
          <ScoreLine label="Game 2 个人分 / Game 2 Individual Score" value={scoreSummary.game2_individual_score} />
          <ScoreLine label="Game 2 团队累计分 / Game 2 Team Accumulated Score" value={scoreSummary.game2_team_accumulated_score} />
          <ScoreLine label="Game 2 最终获得分 / Game 2 Final Earned Score" value={scoreSummary.game2_final_earned_score} />
          <ScoreLine label="个人最终总分 / Individual Final Score" value={scoreSummary.individual_final_score} strong />
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
            href="/profile/setup?next=/profile"
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
          {isAdmin ? (
            <Link
              href="/admin"
              className="text-center text-sm font-black text-slate-500 underline-offset-4 hover:text-[#071525] hover:underline"
            >
              Admin Console
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
