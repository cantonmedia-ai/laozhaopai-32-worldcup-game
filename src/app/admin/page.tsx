import Link from "next/link";
import { AdminLayout } from "@/components/admin-layout";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureChampionSettings } from "@/lib/champion-admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = createServiceClient();
  const settings = await ensureChampionSettings();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [{ count: totalPlayers }, { data: players }, { count: todayEntries }, { data: winners }] =
    await Promise.all([
      supabase.from("players").select("id", { count: "exact", head: true }),
      supabase.from("players").select("selected_country"),
      supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today.toISOString()),
      supabase.from("winners").select("id, is_winner"),
    ]);

  const countryCounts = Object.values(
    (players ?? []).reduce<Record<string, { country: string; count: number }>>((stats, row) => {
      stats[row.selected_country] = stats[row.selected_country] ?? {
        country: row.selected_country,
        count: 0,
      };
      stats[row.selected_country].count += 1;
      return stats;
    }, {}),
  ).sort((a, b) => b.count - a.count);

  return (
    <AdminLayout active="/admin">
      <div className="mb-6">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-[#128c4a]">
          Champion Guess 2026
        </p>
        <h1 className="mt-2 text-4xl font-black">Admin Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card label="Total Players" value={(totalPlayers ?? 0).toLocaleString()} tone="gold" />
        <Card label="Countries Selected" value={countryCounts.length} tone="white" />
        <Card label="Today New Entries" value={todayEntries ?? 0} tone="green" />
        <Card label="Confirmed Winners" value={winners?.filter((row) => row.is_winner).length ?? 0} tone="dark" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-2xl font-black">Country Popularity</h2>
          <div className="mt-4 grid gap-2">
            {countryCounts.slice(0, 12).map((item) => (
              <div key={item.country} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <span className="font-bold">{item.country}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
            {!countryCounts.length ? <div className="text-slate-500">No submissions yet.</div> : null}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-2xl font-black">Game Settings</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <Info label="Submission" value={settings.submission_open ? "Open" : "Closed"} />
            <Info label="Prize Limit" value={settings.prize_limit} />
            <Info label="Official Champion" value={settings.official_champion_country ?? "Not set"} />
            <Info label="Result Confirmed" value={settings.result_confirmed ? "Yes" : "No"} />
          </div>
          <div className="mt-5 grid gap-2">
            <Link className="rounded-lg bg-[#071525] px-4 py-3 text-center font-black text-white" href="/admin/results">
              Set Result
            </Link>
            <a className="rounded-lg bg-[#f4c542] px-4 py-3 text-center font-black text-[#071525]" href="/api/admin/export-players">
              Export Players
            </a>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone: "gold" | "white" | "green" | "dark";
}) {
  const styles = {
    gold: "bg-[#f4c542]",
    white: "bg-white",
    green: "bg-[#128c4a] text-white",
    dark: "bg-[#071525] text-white",
  };
  return (
    <div className={`${styles[tone]} rounded-2xl p-5 shadow`}>
      <div className="text-sm font-black opacity-70">{label}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
      <span className="font-bold text-slate-500">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
