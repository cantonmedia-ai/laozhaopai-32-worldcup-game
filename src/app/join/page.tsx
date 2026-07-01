import { ChampionShell } from "@/components/champion-shell";
import { ChampionJoinForm } from "@/components/champion-join-form";
import { createServiceClient } from "@/lib/supabase/service";
import { MAX_PLAYER_ENTRIES } from "@/lib/champion-guess";

export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const supabase = createServiceClient();
  const { count } = await supabase.from("players").select("id", { count: "exact", head: true });
  const totalPlayers = count ?? 0;

  return (
    <ChampionShell active="/join">
      <section className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <ChampionJoinForm totalPlayers={totalPlayers} maxPlayers={MAX_PLAYER_ENTRIES} />
      </section>
    </ChampionShell>
  );
}
