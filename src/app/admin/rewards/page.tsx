import { AdminLayout } from "@/components/admin-layout";
import { WinnerStatusButton } from "@/components/champion-admin-actions";
import { createServiceClient } from "@/lib/supabase/service";
import { formatDateTime } from "@/lib/champion-guess";
import { prizeForRank } from "@/lib/champion-prizes";

export const dynamic = "force-dynamic";

type WinnerRow = {
  id: string;
  rank: number;
  is_winner: boolean;
  status: string;
  selected_country: string;
  prize_collected_at: string | null;
  admin_note: string | null;
  players: {
    name: string;
    whatsapp: string;
    email: string | null;
    created_at: string;
  } | null;
};

export default async function AdminRewardsPage() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("winners")
    .select("id, rank, is_winner, status, selected_country, prize_collected_at, admin_note, players(name, whatsapp, email, created_at)")
    .order("rank", { ascending: true });
  const winners = (data ?? []) as unknown as WinnerRow[];

  return (
    <AdminLayout active="/admin/rewards">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#128c4a]">
            Winner Management
          </p>
          <h1 className="mt-2 text-4xl font-black">Winners</h1>
          <p className="mt-2 text-slate-600">
            {winners.filter((row) => row.is_winner).length} winners from {winners.length} correct guessers
          </p>
        </div>
        <a
          href="/api/admin/export-winners"
          className="rounded-xl bg-[#f4c542] px-5 py-3 text-center font-black text-[#071525]"
        >
          Export Winners
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <div className="grid min-w-[1060px] grid-cols-[70px_1fr_150px_130px_140px_170px_220px] bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          <span>Rank</span>
          <span>Player</span>
          <span>Prize</span>
          <span>WhatsApp</span>
          <span>Status</span>
          <span>Submitted</span>
          <span>Action</span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[1060px] divide-y divide-slate-100">
            {winners.map((winner) => {
              const prize = prizeForRank(winner.rank);
              return (
                <div
                  key={winner.id}
                  className={`grid grid-cols-[70px_1fr_150px_130px_140px_170px_220px] gap-3 px-4 py-3 text-sm ${
                    winner.is_winner ? "" : "bg-slate-50 text-slate-500"
                  }`}
                >
                  <strong>#{winner.rank}</strong>
                  <div>
                    <strong>{winner.players?.name ?? "-"}</strong>
                    <div className="text-xs text-slate-500">{winner.players?.email ?? "-"}</div>
                  </div>
                  <span className="font-bold">{winner.is_winner ? prize?.tier ?? "-" : "-"}</span>
                  <span>{winner.players?.whatsapp ?? "-"}</span>
                  <span className={winner.status === "prize_collected" ? "font-black text-[#128c4a]" : ""}>
                    {winner.is_winner ? winner.status.replaceAll("_", " ") : "Correct only"}
                  </span>
                  <span className="text-slate-500">{formatDateTime(winner.players?.created_at)}</span>
                  {winner.is_winner ? (
                    <WinnerStatusButton winnerId={winner.id} status={winner.status} />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">Outside prize limit</span>
                  )}
                </div>
              );
            })}
            {!winners.length ? (
              <div className="p-6 text-center text-slate-500">
                No winners yet. Set the official champion first.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
