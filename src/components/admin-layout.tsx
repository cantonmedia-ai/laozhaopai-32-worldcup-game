import Link from "next/link";
import {
  ClipboardList,
  FileClock,
  Gift,
  LayoutDashboard,
  ListChecks,
  Medal,
  Network,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import clsx from "clsx";

const adminNav = [
  { href: "/admin/games", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/games", label: "Games", icon: Trophy },
  { href: "/admin/teams", label: "Teams", icon: ShieldCheck },
  { href: "/admin/rounds", label: "Rounds", icon: ListChecks },
  { href: "/admin/matches", label: "Matches", icon: ClipboardList },
  { href: "/admin/results", label: "Results", icon: Medal },
  { href: "/admin/players", label: "Players", icon: Users },
  { href: "/admin/predictions", label: "Predictions", icon: ClipboardList },
  { href: "/admin/leaderboards", label: "Leaderboards", icon: Medal },
  { href: "/admin/referrals", label: "Referrals", icon: Network },
  { href: "/admin/rewards", label: "Rewards", icon: Gift },
  { href: "/admin/audit", label: "Audit", icon: FileClock },
];

export function AdminLayout({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 md:grid md:grid-cols-[260px_1fr]">
      <aside className="bg-[#071525] p-4 text-white">
        <Link href="/fifa-last-32" className="mb-6 flex items-center gap-2 font-black">
          <span className="grid size-9 place-items-center rounded bg-[#d71920]">
            招
          </span>
          Admin 后台管理
        </Link>
        <nav className="grid gap-1">
          {adminNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2 rounded px-3 py-2 text-sm font-bold",
                  active === item.href
                    ? "bg-[#f4c542] text-[#071525]"
                    : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon size={16} /> {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="p-4 md:p-8">{children}</main>
    </div>
  );
}
