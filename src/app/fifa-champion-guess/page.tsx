import Link from "next/link";
import { Trophy, Users, Gift, Clock } from "lucide-react";
import { ChampionShell, StatCard } from "@/components/champion-shell";
import { createServiceClient } from "@/lib/supabase/service";
import { CHAMPION_COUNTRIES, formatDateTime } from "@/lib/champion-guess";
import { ensureChampionSettings } from "@/lib/champion-admin";

export const dynamic = "force-dynamic";

async function loadHomeData() {
  const supabase = createServiceClient();
  const settings = await ensureChampionSettings();
  const [{ count }, { data: players }, { data: recent }] = await Promise.all([
    supabase.from("players").select("id", { count: "exact", head: true }),
    supabase.from("players").select("selected_country, selected_country_code").eq("is_disqualified", false),
    supabase
      .from("players")
      .select("name, selected_country, selected_country_code, created_at")
      .eq("is_disqualified", false)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const countryStats = Object.values(
    (players ?? []).reduce<Record<string, { country: string; code: string | null; count: number }>>(
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
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    settings,
    totalPlayers: count ?? 0,
    countryStats,
    recent: recent ?? [],
  };
}

export default async function FifaLast32Page() {
  const data = await loadHomeData();

  return (
    <ChampionShell active="/fifa-champion-guess">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(244,197,66,0.22),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(18,140,74,0.25),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[minmax(0,1.1fr)_420px] md:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f4c542]/50 bg-[#f4c542]/10 px-4 py-2 text-sm font-black text-[#f4c542]">
              <Trophy size={16} />
              153 Gifts Available
            </div>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.95] md:text-7xl">
              FIFA 2026 Champion Guess
            </h1>
            <p className="mt-5 max-w-2xl text-xl leading-8 text-slate-300">
              Pick one country you believe will become FIFA World Cup 2026 champion.
              Earliest correct guesses win the prizes.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/join"
                className="rounded-xl bg-[#d71920] px-6 py-4 text-center text-lg font-black text-white shadow-xl shadow-red-700/25"
              >
                Join Now
              </Link>
              <Link
                href="/players"
                className="rounded-xl bg-white px-6 py-4 text-center text-lg font-black text-[#071525]"
              >
                View Participants
              </Link>
              <Link
                href="/prizes"
                className="rounded-xl border border-[#f4c542]/60 px-6 py-4 text-center text-lg font-black text-[#f4c542]"
              >
                奖品规则
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="grid gap-3">
              <StatCard label="Total Players" value={data.totalPlayers.toLocaleString()} tone="gold" />
              <StatCard label="Prize Limit" value={data.settings.prize_limit} tone="green" />
              <StatCard
                label="Submission Status"
                value={data.settings.submission_open ? "Open" : "Closed"}
                tone="dark"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-100 px-4 py-8 text-[#071525]">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-900/10">
            <Gift className="text-[#d71920]" />
            <h2 className="mt-3 text-2xl font-black">153 prizes</h2>
            <p className="mt-2 text-slate-600">
              Guess the champion first. If correct guessers are fewer than 153, earliest participants fill the remaining prizes.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-900/10">
            <Users className="text-[#128c4a]" />
            <h2 className="mt-3 text-2xl font-black">One entry only</h2>
            <p className="mt-2 text-slate-600">One WhatsApp number can submit once only.</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-900/10">
            <Clock className="text-[#9a6a00]" />
            <h2 className="mt-3 text-2xl font-black">No changes</h2>
            <p className="mt-2 text-slate-600">Once submitted, your champion pick cannot be changed.</p>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-8 text-[#071525]">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <h2 className="text-3xl font-black">Popular Country Picks</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.countryStats.length ? (
                data.countryStats.map((item) => {
                  const country = CHAMPION_COUNTRIES.find((entry) => entry.name === item.country);
                  return (
                    <div key={item.country} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="text-3xl">{country?.flag ?? "⚽"}</span>
                          <div>
                            <div className="font-black">{item.country}</div>
                            <div className="text-sm text-slate-500">{country?.group ?? item.code}</div>
                          </div>
                        </div>
                        <div className="text-2xl font-black text-[#d71920]">{item.count}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-5 text-slate-500">
                  No picks yet. Be the first player.
                </div>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-[#071525] p-5 text-white">
            <h2 className="text-2xl font-black">Recent Participants</h2>
            <div className="mt-4 grid gap-3">
              {data.recent.length ? (
                data.recent.map((player) => {
                  const country = CHAMPION_COUNTRIES.find((entry) => entry.name === player.selected_country);
                  return (
                    <div key={`${player.name}-${player.created_at}`} className="rounded-xl bg-white/10 p-3">
                      <div className="font-black">{player.name}</div>
                      <div className="text-sm text-slate-300">
                        Picked {country?.flag ?? "⚽"} {player.selected_country}
                      </div>
                      <div className="text-xs text-slate-500">{formatDateTime(player.created_at)}</div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl bg-white/10 p-4 text-slate-300">No players yet.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="rules" className="bg-slate-100 px-4 py-8 text-[#071525]">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/10">
          <h2 className="text-3xl font-black">Rules</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              "Pick one FIFA 2026 champion country.",
              "Fill in name and WhatsApp number.",
              "One WhatsApp number can join once only.",
              "After submission, prediction cannot be changed.",
              "Admin enters official champion after the final.",
              `Correct champion guessers win first by submission time.`,
              `If fewer than ${data.settings.prize_limit} players guessed correctly, remaining prizes go to earliest other participants.`,
            ].map((rule, index) => (
              <div key={rule} className="rounded-xl bg-slate-50 p-4 font-bold text-slate-700">
                {index + 1}. {rule}
              </div>
            ))}
          </div>
        </div>
      </section>
    </ChampionShell>
  );
}
