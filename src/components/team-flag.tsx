import Image from "next/image";
import clsx from "clsx";
import type { Team } from "@/types/game";

export function TeamFlag({
  team,
  className,
  priority,
}: {
  team: Team;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-lg bg-slate-100 shadow-sm",
        className,
      )}
    >
      <Image
        src={team.flagImage}
        alt={`${team.name} flag`}
        fill
        sizes="(max-width: 768px) 42vw, 260px"
        className="object-cover"
        priority={priority}
      />
    </div>
  );
}

export function FlagChip({ team }: { team: Team }) {
  return (
    <span className="inline-flex items-center gap-2 rounded bg-white px-2 py-1 shadow-sm">
      <TeamFlag team={team} className="h-6 w-9 rounded" />
      <span className="text-xs font-black text-slate-700">{team.shortName}</span>
    </span>
  );
}
