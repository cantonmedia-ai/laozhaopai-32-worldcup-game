import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { getCurrentRound, getMe, profiles } from "@/lib/demo-data";
import { rankingMovement } from "@/lib/scoring";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

export default async function GamePage() {
  if (hasSupabaseServerEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login?next=/game");

    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_completed, display_name, nickname, phone, phone_number, whatsapp_number")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (
      !profile?.profile_completed ||
      !(profile.display_name || profile.nickname) ||
      !(profile.phone || profile.phone_number || profile.whatsapp_number)
    ) {
      redirect("/profile-setup?next=/game");
    }
  }

  const me = getMe();
  const round = getCurrentRound();

  return (
    <PageShell active="/game">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <SectionHeader
          eyebrow="Player Dashboard"
          title={`欢迎回来，${me.displayName}`}
          body="查看你的总分、排名、当前阶段和下一次预测截止时间。"
        />
        <div className="grid gap-4 md:grid-cols-5">
          <StatCard label="当前阶段" value={round.labelCn} tone="green" />
          <StatCard label="我的排名" value={`#${me.rank}`} detail={rankingMovement(me)} tone="gold" />
          <StatCard label="我的战队" value="2人" />
          <StatCard label="总分" value={me.totalScore} tone="navy" />
          <StatCard label="预测截止" value="7月1日" detail="12:00 PM" />
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["/predict", "进入预测", "选择每场你认为会晋级的球队。"],
            ["/leaderboard", "查看排行榜", "总榜、本轮、好友和人气榜。"],
            ["/squad", "分享战队", "复制邀请链接，和朋友一起上榜。"],
          ].map(([href, title, body]) => (
            <Link key={href} href={href} className="card p-5 transition hover:-translate-y-1">
              <h2 className="text-xl font-black text-slate-950">{title}</h2>
              <p className="mt-2 text-slate-600">{body}</p>
            </Link>
          ))}
        </div>
        <div className="mt-8 rounded-lg bg-white p-5">
          <h2 className="text-xl font-black">总榜前列</h2>
          <div className="mt-4 grid gap-3">
            {profiles.slice(0, 3).map((player) => (
              <div key={player.id} className="flex items-center justify-between rounded bg-slate-100 p-4">
                <span className="font-black">#{player.rank} {player.displayName}</span>
                <span className="font-black text-[#d71920]">{player.totalScore}分</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </PageShell>
  );
}
