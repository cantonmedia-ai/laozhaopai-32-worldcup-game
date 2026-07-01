import Link from "next/link";
import { ChampionShell } from "@/components/champion-shell";
import { createServiceClient } from "@/lib/supabase/service";
import { CHAMPION_COUNTRIES, formatDateTime } from "@/lib/champion-guess";

export const dynamic = "force-dynamic";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const country = params.country?.trim() ?? "";
  const sort = params.sort === "newest" ? "newest" : "oldest";
  const supabase = createServiceClient();

  let query = supabase
    .from("players")
    .select("id, name, selected_country, selected_country_code, group_name, created_at", {
      count: "exact",
    })
    .eq("is_disqualified", false);

  if (q) query = query.ilike("name", `%${q}%`);
  if (country) query = query.eq("selected_country", country);

  const [{ data: players, count }, { data: countryRows }] = await Promise.all([
    query.order("created_at", { ascending: sort === "oldest" }).limit(200),
    supabase.from("players").select("selected_country, selected_country_code").eq("is_disqualified", false),
  ]);

  const countryStats = Object.values(
    (countryRows ?? []).reduce<Record<string, { country: string; code: string | null; count: number }>>(
      (stats, row) => {
        stats[row.selected_country] = stats[row.selected_country] ?? {
          country: row.selected_country,
          code: row.selected_country_code,
          count: 0,
        };
        stats[row.selected_country].count += 1;
        return stats;
      },
      {},
    ),
  ).sort((a, b) => b.count - a.count);

  return (
    <ChampionShell active="/players">
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-3xl bg-white p-5 text-[#071525] shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-black uppercase tracking-[0.25em] text-[#128c4a]">
                Public List
              </div>
              <h1 className="mt-2 text-4xl font-black">Participants</h1>
              <p className="mt-2 text-slate-600">
                Public view only. WhatsApp and email are hidden.
              </p>
            </div>
            <Link
              href="/join"
              className="rounded-xl bg-[#d71920] px-5 py-3 text-center font-black text-white"
            >
              Join Now
            </Link>
          </div>

          <form className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_150px_auto]">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name"
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
            <select
              name="sort"
              defaultValue={sort}
              className="rounded-xl border border-slate-200 px-4 py-3"
            >
              <option value="oldest">Oldest</option>
              <option value="newest">Newest</option>
            </select>
            <button className="rounded-xl bg-[#071525] px-5 py-3 font-black text-white">Filter</button>
          </form>

          <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-black text-slate-500">Total players</div>
              <div className="text-4xl font-black">{(count ?? 0).toLocaleString()}</div>
              <div className="mt-4 grid gap-2">
                {countryStats.slice(0, 10).map((item) => {
                  const countryInfo = CHAMPION_COUNTRIES.find((entry) => entry.name === item.country);
                  return (
                    <div key={item.country} className="flex items-center justify-between rounded-lg bg-white p-2 text-sm">
                      <span>
                        {countryInfo?.flag ?? "⚽"} {item.country}
                      </span>
                      <strong>{item.count}</strong>
                    </div>
                  );
                })}
              </div>
            </aside>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[1fr_1fr_120px] bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                <span>Name</span>
                <span>Champion Pick</span>
                <span>Join Date</span>
              </div>
              <div className="divide-y divide-slate-100">
                {(players ?? []).map((player) => {
                  const countryInfo = CHAMPION_COUNTRIES.find((entry) => entry.name === player.selected_country);
                  return (
                    <div
                      key={player.id}
                      className="grid grid-cols-[1fr_1fr_120px] gap-2 px-4 py-3 text-sm"
                    >
                      <strong className="truncate">{player.name}</strong>
                      <span className="truncate">
                        {countryInfo?.flag ?? "⚽"} {player.selected_country}
                      </span>
                      <span className="text-slate-500">{formatDateTime(player.created_at)}</span>
                    </div>
                  );
                })}
                {!players?.length ? (
                  <div className="p-6 text-center font-bold text-slate-500">No participants found.</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </ChampionShell>
  );
}
