import { ChampionShell } from "@/components/champion-shell";
import { ChampionJoinForm } from "@/components/champion-join-form";

export const dynamic = "force-dynamic";

export default function JoinPage() {
  return (
    <ChampionShell active="/join">
      <section className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <ChampionJoinForm />
      </section>
    </ChampionShell>
  );
}
