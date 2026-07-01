import { AdminLayout } from "@/components/admin-layout";
import { PlayerDisqualifyButton } from "@/components/champion-admin-actions";
import { createServiceClient } from "@/lib/supabase/service";
import { CHAMPION_COUNTRIES, formatDateTime } from "@/lib/champion-guess";

export const dynamic = "force-dynamic";

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const country = params.country?.trim() ?? "";
  const supabase = createServiceClient();
  let query = supabase.from("players").select("*", { count: "exact" });

  if (q) query = query.or(`name.ilike.%${q}%,whatsapp.ilike.%${q}%,email.ilike.%${q}%`);
  if (country) query = query.eq("selected_country", country);

  const { data: players, count } = await query.order("created_at", { ascending: false }).limit(500);

  return (
    <AdminLayout active="/admin/players">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#128c4a]">
            Player Management
          </p>
          <h1 className="mt-2 text-4xl font-black">Players</h1>
          <p className="mt-2 text-slate-600">{(count ?? 0).toLocaleString()} records found</p>
        </div>
        <a
          href="/api/admin/export-players"
          className="rounded-xl bg-[#f4c542] px-5 py-3 text-center font-black text-[#071525]"
        >
          Export Players
        </a>
      </div>

      <form className="mb-5 grid gap-3 rounded-2xl bg-white p-4 shadow md:grid-cols-[1fr_240px_auto]">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, WhatsApp, or email"
          className="rounded-xl border border-slate-200 px-4 py-3"
        />
        <select
          name="country"
          defaultValue={country}
          className="rounded-xl border border-slate-200 px-4 py-3"
        >
          <option value="">All countries</option>
          {CHAMPION_COUNTRIES.map((item) => (
            <option key={item.code} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
        <button className="rounded-xl bg-[#071525] px-5 py-3 font-black text-white">Filter</button>
      </form>

      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <div className="grid min-w-[900px] grid-cols-[1.1fr_140px_180px_180px_170px_110px] bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          <span>Player</span>
          <span>WhatsApp</span>
          <span>Email</span>
          <span>Champion</span>
          <span>Submitted</span>
          <span>Action</span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[900px] divide-y divide-slate-100">
            {(players ?? []).map((player) => (
              <div
                key={player.id}
                className={`grid grid-cols-[1.1fr_140px_180px_180px_170px_110px] gap-3 px-4 py-3 text-sm ${
                  player.is_disqualified ? "bg-red-50" : ""
                }`}
              >
                <div>
                  <strong>{player.name}</strong>
                  {player.admin_note ? <div className="text-xs text-red-700">{player.admin_note}</div> : null}
                </div>
                <span>{player.whatsapp}</span>
                <span className="truncate">{player.email || "-"}</span>
                <span>{player.selected_country}</span>
                <span className="text-slate-500">{formatDateTime(player.created_at)}</span>
                <PlayerDisqualifyButton
                  playerId={player.id}
                  isDisqualified={Boolean(player.is_disqualified)}
                />
              </div>
            ))}
            {!players?.length ? <div className="p-6 text-center text-slate-500">No players found.</div> : null}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
