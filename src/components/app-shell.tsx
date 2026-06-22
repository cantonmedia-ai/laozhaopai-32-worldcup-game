import Link from "next/link";
import {
  BookOpenText,
  ChartNoAxesColumnIncreasing,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import clsx from "clsx";

const playerNav = [
  { href: "/game", label: "Play", icon: Trophy },
  { href: "/squad", label: "Team", icon: UsersRound },
  { href: "/leaderboard", label: "Ranking", icon: ChartNoAxesColumnIncreasing },
  { href: "/rules", label: "Rules", icon: BookOpenText },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/admin", label: "Admin", icon: Settings },
];

const publicNav = [
  { href: "/rules", label: "Rules & Prizes", icon: BookOpenText },
];

export function TopNav({
  active,
  publicMode = false,
}: {
  active?: string;
  publicMode?: boolean;
}) {
  const items = publicMode ? publicNav : playerNav;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#071525]/90 text-white backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:h-16">
        <Link
          href={publicMode ? "/fifa-last-32" : "/game"}
          className="flex min-w-0 flex-1 items-center gap-3 font-black"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded bg-[#d71920] text-sm text-white">
            ⚽
          </span>
          <span className="min-w-0 truncate text-sm sm:hidden">Knockout</span>
          <span className="hidden min-w-0 truncate text-base sm:inline">
            Knockout Challenge
          </span>
        </Link>

        {items.length ? (
          <nav className="hidden shrink-0 items-center gap-1 lg:flex">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold transition",
                    active === item.href
                      ? "bg-[#f4c542] text-[#071525]"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {publicMode ? (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/rules"
              className="grid h-10 place-items-center rounded bg-white/10 px-3 text-xs font-black text-white hover:bg-white/15 lg:hidden"
            >
              Rules
            </Link>
            <Link
              href="/login?next=/game&mode=login"
              className="grid h-10 place-items-center rounded bg-[#d71920] px-3 text-xs font-black text-white hover:bg-red-700 sm:h-11 sm:text-sm"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <Link
            href="/predict"
            className="hidden h-11 shrink-0 items-center justify-center gap-2 rounded bg-[#d71920] px-4 text-sm font-black text-white hover:bg-red-700 sm:flex"
          >
            <ShieldCheck size={17} />
            Play Now
          </Link>
        )}
      </div>
    </header>
  );
}

export function MobileNav({
  active,
  publicMode = false,
}: {
  active?: string;
  publicMode?: boolean;
}) {
  const items = publicMode ? [] : playerNav;

  if (publicMode) return null;

  return (
    <nav
      className={clsx(
        "fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] text-slate-700 shadow-2xl md:hidden",
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex min-h-16 min-w-[72px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold",
              active === item.href ? "text-[#d71920]" : "text-slate-600",
            )}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PageShell({
  active,
  publicMode = false,
  children,
}: {
  active?: string;
  publicMode?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-100 pb-24 text-slate-950 md:pb-0">
      <TopNav active={active} publicMode={publicMode} />
      {children}
      <footer className="px-4 py-6 text-center text-xs leading-relaxed text-slate-500">
        <p>© 2026 Brainwave Games</p>
        <p>Powered by Brainwave AI</p>
      </footer>
      <MobileNav active={active} publicMode={publicMode} />
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  body?: string;
}) {
  return (
    <div className="mb-6">
      {eyebrow ? (
        <p className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-[#0f8a4b]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
        {title}
      </h1>
      {body ? <p className="mt-3 max-w-2xl text-slate-600">{body}</p> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  tone = "white",
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "white" | "green" | "gold" | "navy";
}) {
  const tones = {
    white: "bg-white text-slate-950",
    green: "bg-[#0f8a4b] text-white",
    gold: "bg-[#f4c542] text-[#071525]",
    navy: "bg-[#071525] text-white",
  };

  return (
    <div className={clsx("rounded-lg p-5 shadow-sm", tones[tone])}>
      <p className="text-sm font-bold opacity-75">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      {detail ? <p className="mt-2 text-sm opacity-80">{detail}</p> : null}
    </div>
  );
}
