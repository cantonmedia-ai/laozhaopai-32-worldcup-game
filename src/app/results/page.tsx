import Link from "next/link";
import { ChampionShell } from "@/components/champion-shell";
import { ensureChampionSettings } from "@/lib/champion-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { CHAMPION_COUNTRIES, formatDateTime } from "@/lib/champion-guess";
import { prizeForRank } from "@/lib/champion-prizes";

export const dynamic = "force-dynamic";

type WinnerRow = {
  id: string;
  rank: number;
  is_winner: boolean;
  status: string;
  selected_country: string;
  players: {
    name: string;
    created_at: string;
  } | null;
};

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim().toLowerCase() ?? "";
  const settings = await ensureChampionSettings();
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("winners")
    .select("id, rank, is_winner, status, selected_country, players(name, created_at)")
    .order("rank", { ascending: true })
    .limit(500);
  const rows = ((data ?? []) as unknown as WinnerRow[]).filter((row) =>
    q ? row.players?.name.toLowerCase().includes(q) : true,
  );
  const champion = CHAMPION_COUNTRIES.find((item) => item.name === settings.official_champion_country);
  const totalWinners = rows.filter((row) => row.is_winner).length;

  return (
    <ChampionShell active="/results">
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-3xl bg-white p-5 text-[#071525] shadow-2xl shadow-black/20">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-[#9a6a00]">
            Champion Result
          </div>
          <h1 className="mt-2 text-4xl font-black">Results</h1>

          {!settings.result_confirmed ? (
            <div className="mt-6 rounded-2xl bg-[#071525] p-6 text-white">
              <h2 className="text-3xl font-black">Result not announced yet.</h2>
              <p className="mt-3 text-slate-300">
                Winners will appear here after admin confirms the official FIFA 2026 champion.
              </p>
              <Link
                href="/join"
                className="mt-6 inline-block rounded-xl bg-[#f4c542] px-5 py-3 font-black text-[#071525]"
              >
                Join Before It Closes
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-2xl bg-[#071525] p-6 text-center text-white">
                <div className="text-sm font-black uppercase tracking-[0.24em] text-[#f4c542]">
                  Official Champion
                </div>
                <div className="mt-3 text-5xl font-black">
                  {champion?.flag ?? "⚽"} {settings.official_champion_country}
                </div>
                <div className="mt-2 text-sm text-slate-300">
                  Confirmed on {formatDateTime(settings.result_confirmed_at)}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[#f4c542] p-4">
                  <div className="text-sm font-black opacity-70">Prize Limit</div>
                  <div className="text-3xl font-black">{settings.prize_limit}</div>
                </div>
                <div className="rounded-xl bg-[#128c4a] p-4 text-white">
                  <div className="text-sm font-black opacity-70">Total Winners</div>
                  <div className="text-3xl font-black">{totalWinners}</div>
                </div>
                <div className="rounded-xl bg-slate-100 p-4">
                  <div className="text-sm font-black opacity-70">Correct Guessers</div>
                  <div className="text-3xl font-black">{rows.length}</div>
                </div>
              </div>

              <form className="mt-5 flex gap-2">
                <input
                  name="q"
                  defaultValue={params.q ?? ""}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3"
                  placeholder="Search your name"
                />
                <button className="rounded-xl bg-[#071525] px-5 py-3 font-black text-white">Search</button>
              </form>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-[64px_1fr_110px] bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  <span>Rank</span>
                  <span>Name</span>
                  <span>Prize</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const prize = prizeForRank(row.rank);
                    const guessedChampion = row.selected_country === settings.official_champion_country;
                    return (
                      <div key={row.id} className="grid grid-cols-[64px_1fr_110px] gap-2 px-4 py-3 text-sm">
                        <strong>#{row.rank}</strong>
                        <span className="min-w-0">
                          <span className="block truncate font-bold">{row.players?.name ?? "-"}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {guessedChampion ? "猜中冠军" : "替代获胜者"}
                          </span>
                        </span>
                        <span className={row.is_winner ? "font-black text-[#128c4a]" : "text-slate-500"}>
                          {row.is_winner ? prize?.tier ?? "Winner" : "Correct"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </ChampionShell>
  );
}
