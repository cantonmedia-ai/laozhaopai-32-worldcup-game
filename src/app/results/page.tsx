import Link from "next/link";
import { Trophy } from "lucide-react";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { getMe } from "@/lib/demo-data";
import { rankingMovement } from "@/lib/scoring";

export default function ResultsPage() {
  const me = getMe();

  return (
    <PageShell active="/game">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <SectionHeader eyebrow="Result Reveal" title="本轮赛果已揭晓！" />
        <div className="rounded-lg bg-[#071525] p-6 text-white shadow-2xl">
          <Trophy className="text-[#f4c542]" size={52} />
          <h2 className="mt-4 text-4xl font-black">你本轮获得 30 分</h2>
          <p className="mt-3 text-white/75">
            当前总分 {me.totalScore} 分，当前排名第 {me.rank} 名，{rankingMovement(me)}。
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <StatCard label="本轮得分" value="30" tone="gold" />
            <StatCard label="总分" value={me.totalScore} />
            <StatCard label="当前排名" value={`#${me.rank}`} tone="green" />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/leaderboard" className="rounded bg-[#d71920] px-5 py-3 text-center font-black text-white">
              查看排行榜
            </Link>
            <Link href="/predict" className="rounded bg-white px-5 py-3 text-center font-black text-[#071525]">
              下一轮预测
            </Link>
          </div>
        </div>
        <p className="mt-3 text-center text-xs font-semibold text-[#b99a35]">
          A Brainwave AI Experience
        </p>
      </main>
    </PageShell>
  );
}
