import Link from "next/link";
import {
  ChartNoAxesColumnIncreasing,
  Gift,
  Home,
  ShieldCheck,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import clsx from "clsx";

const nav = [
  { href: "/fifa-last-32", label: "Last 32", icon: Home },
  { href: "/game", label: "战况", icon: Trophy },
  { href: "/predict", label: "预测", icon: ShieldCheck },
  { href: "/leaderboard", label: "排行", icon: ChartNoAxesColumnIncreasing },
  { href: "/squad", label: "战队", icon: UsersRound },
  { href: "/rewards", label: "奖品", icon: Gift },
  { href: "/profile", label: "我的", icon: UserRound },
];

export function TopNav({ active }: { active?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#071525]/90 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/fifa-last-32" className="flex items-center gap-2 font-black">
          <span className="grid size-9 place-items-center rounded bg-[#d71920] text-sm text-white">
            招
          </span>
          <span>Last 32 Challenge</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => {
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
        <Link
          href="/admin"
          className="rounded bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
        >
          Admin
        </Link>
      </div>
    </header>
  );
}

export function MobileNav({ active }: { active?: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-slate-200 bg-white text-slate-700 shadow-2xl md:hidden">
      {nav.slice(1, 7).map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold",
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
  children,
}: {
  active?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 pb-20 text-slate-950 md:pb-0">
      <TopNav active={active} />
      {children}
      <MobileNav active={active} />
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
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
