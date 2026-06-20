import { PageShell, SectionHeader } from "@/components/app-shell";
import { PredictionBoard } from "@/components/prediction-board";
import { getCurrentMatches, getCurrentRound } from "@/lib/demo-data";

export default function PredictPage() {
  const round = getCurrentRound();
  const matches = getCurrentMatches();

  return (
    <PageShell active="/predict">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <SectionHeader
          eyebrow={`${round.labelCn} · ${round.scoringPoints} points`}
          title="Level 1 选胜方，Level 2 猜比分"
          body="胜方选择和比分猜测是两个独立答案。你可以选一队晋级，也可以用不同比分做保险。"
        />
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-slate-500">
              Level 1 猜中胜方
            </p>
            <p className="mt-1 text-2xl font-black text-[#d71920]">
              +{round.scoringPoints}分
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-slate-500">
              Level 2 猜中一队比分
            </p>
            <p className="mt-1 text-2xl font-black text-[#0f8a4b]">+5分</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-slate-500">
              Level 2 猜中完整比分
            </p>
            <p className="mt-1 text-2xl font-black text-[#f4c542]">+15分</p>
          </div>
        </div>
        <PredictionBoard matches={matches} />
      </main>
    </PageShell>
  );
}
