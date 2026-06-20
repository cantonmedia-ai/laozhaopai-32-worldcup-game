import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { getTeam, predictions } from "@/lib/demo-data";

export default function AdminPredictionsPage() {
  return (
    <AdminLayout active="/admin/predictions">
      <SectionHeader eyebrow="Predictions" title="玩家预测" />
      <div className="card overflow-hidden">
        {predictions.map((prediction) => (
          <div key={prediction.id} className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-b-0">
            <span className="font-black">Match {prediction.matchId}</span>
            <span>{getTeam(prediction.predictedWinnerTeamId).name}</span>
            <span className="font-black text-[#d71920]">{prediction.scoreAwarded}分</span>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
