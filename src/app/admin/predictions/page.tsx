import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { ApiMatchSyncAdmin } from "@/components/api-match-sync-admin";
import { getTeam, predictions } from "@/lib/demo-data";
import { knockoutWinnerAdminTitle } from "@/lib/knockout-winner";

export default function AdminPredictionsPage() {
  return (
    <AdminLayout active="/admin/predictions">
      <SectionHeader
        eyebrow="Knockout Winner Challenge"
        title={knockoutWinnerAdminTitle}
        body="Set lock times in match management, enter actual winners in results, and calculate winner points without duplicate scoring."
      />
      <ApiMatchSyncAdmin />
      <div className="card overflow-hidden">
        {predictions.map((prediction) => (
          <div
            key={prediction.id}
            className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-b-0"
          >
            <span className="font-black">Match {prediction.matchId}</span>
            <span>{getTeam(prediction.predictedWinnerTeamId).name}</span>
            <span className="font-black text-[#d71920]">
              {prediction.scoreAwarded} pts
            </span>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
