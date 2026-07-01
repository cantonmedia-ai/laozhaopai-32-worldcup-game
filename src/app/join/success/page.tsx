import Link from "next/link";
import { CheckCircle2, Share2 } from "lucide-react";
import { ChampionShell } from "@/components/champion-shell";
import { createServiceClient } from "@/lib/supabase/service";
import { CHAMPION_COUNTRIES, formatDateTime } from "@/lib/champion-guess";

export const dynamic = "force-dynamic";

export default async function JoinSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();
  const [{ data: player }, { count }] = await Promise.all([
    supabase
      .from("players")
      .select("name, selected_country, selected_country_code, created_at")
      .eq("id", params.id ?? "")
      .maybeSingle(),
    supabase.from("players").select("id", { count: "exact", head: true }),
  ]);
  const country = CHAMPION_COUNTRIES.find((item) => item.name === player?.selected_country);
  const shareText = encodeURIComponent(
    "I joined Brainwave Games FIFA 2026 Champion Guess. Pick your champion too: https://games.brainwaveai.my/fifa-last-32",
  );

  return (
    <ChampionShell active="/join">
      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl bg-white p-6 text-center text-[#071525] shadow-2xl shadow-black/20">
          <CheckCircle2 className="mx-auto text-[#128c4a]" size={56} />
          <h1 className="mt-4 text-4xl font-black">Thank you{player?.name ? `, ${player.name}` : ""}!</h1>
          <p className="mt-3 text-slate-600">Your champion prediction has been submitted.</p>

          <div className="mt-6 rounded-2xl bg-[#071525] p-5 text-white">
            <div className="text-sm font-black uppercase tracking-[0.22em] text-[#f4c542]">
              Your Champion Pick
            </div>
            <div className="mt-3 text-4xl font-black">
              {country?.flag ?? "⚽"} {player?.selected_country ?? "-"}
            </div>
            <div className="mt-3 text-sm text-slate-300">
              Submitted on {formatDateTime(player?.created_at)}
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-yellow-50 p-4">
            <div className="text-sm font-black text-[#9a6a00]">Total participants</div>
            <div className="text-3xl font-black">{(count ?? 0).toLocaleString()}</div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a
              href={`https://wa.me/?text=${shareText}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#128c4a] px-5 py-4 font-black text-white"
            >
              <Share2 size={18} />
              Share
            </a>
            <Link
              href="/players"
              className="rounded-xl bg-[#f4c542] px-5 py-4 font-black text-[#071525]"
            >
              View Participant List
            </Link>
          </div>
        </div>
      </section>
    </ChampionShell>
  );
}
