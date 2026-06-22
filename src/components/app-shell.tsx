import Link from "next/link";
import {
  ChartNoAxesColumnIncreasing,
  Gift,
  Home,
  LogOut,
  Route,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import clsx from "clsx";

const playerNav = [
  { href: "/fifa-last-32", label: "Last 32", icon: Home },
  { href: "/game", label: "Dashboard", icon: Trophy },
  { href: "/road-to-champion", label: "Road", icon: Route },
  { href: "/predict", label: "Winner", icon: ShieldCheck },
  { href: "/team-knockout", label: "Team", icon: UsersRound },
  { href: "/leaderboard", label: "Ranking", icon: ChartNoAxesColumnIncreasing },
  { href: "/referral", label: "Referral", icon: UsersRound },
  { href: "/profile", label: "Profile", icon: UserRound },
];

const publicNav = [
  { href: "/fifa-last-32", label: "Home", icon: Home },
  { href: "/rules", label: "How to Play", icon: ShieldCheck },
  { href: "/rewards", label: "Prizes", icon: Gift },
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
          href="/fifa-last-32"
          className="flex min-w-0 flex-1 items-center gap-3 font-black"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded bg-[#d71920] text-sm text-white">
            ⚽
          </span>
          <span className="min-w-0 truncate text-sm sm:hidden">Last 32</span>
          <span className="hidden min-w-0 truncate text-base sm:inline">
            Last 32 Challenge
          </span>
        </Link>

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

        {publicMode ? (
          <Link
            href="/login?next=/game"
            className="grid h-11 shrink-0 place-items-center rounded bg-[#d71920] px-3 text-sm font-black text-white hover:bg-red-700"
          >
            Join
          </Link>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/admin"
              aria-label="Admin"
              className="grid size-11 place-items-center rounded bg-white/10 text-white hover:bg-white/15 sm:w-auto sm:px-3 sm:text-sm sm:font-semibold"
            >
              <Settings size={17} className="sm:hidden" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                aria-label="Logout"
                className="grid size-11 place-items-center rounded bg-white/10 text-white hover:bg-white/15"
              >
                <LogOut size={17} />
              </button>
            </form>
          </div>
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
  const items = publicMode ? publicNav : playerNav;

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
