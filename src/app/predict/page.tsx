import { PageShell, SectionHeader } from "@/components/app-shell";
import { PredictionBoard } from "@/components/prediction-board";
import { getCurrentMatches } from "@/lib/demo-data";
import { requireCompletedProfile } from "@/lib/auth-guards";
import {
  knockoutWinnerDescription,
  knockoutWinnerNameCn,
  knockoutWinnerNameEn,
  knockoutWinnerSubtitle,
} from "@/lib/knockout-winner";

export default async function PredictPage() {
  await requireCompletedProfile("/predict");
  const matches = getCurrentMatches();

  return (
    <PageShell active="/predict">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeader
          eyebrow="Knockout Winner Challenge"
          title={
            <>
              {knockoutWinnerNameCn}
              <br />
              <span className="text-2xl md:text-3xl">{knockoutWinnerNameEn}</span>
            </>
          }
          body={`${knockoutWinnerSubtitle} ${knockoutWinnerDescription}`}
        />
        <PredictionBoard matches={matches} />
      </main>
    </PageShell>
  );
}
