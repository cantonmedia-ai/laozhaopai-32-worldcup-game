import Link from "next/link";
import {
  ClipboardList,
  FileClock,
  Gift,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  Medal,
  Network,
  Route,
  ShieldCheck,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { requireAdminPasswordAccess } from "@/lib/admin-password";

const adminNav = [
  { href: "/admin/games", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/teams", label: "Teams", icon: ShieldCheck },
  { href: "/admin/road-to-champion", label: "Road to Champion", icon: Route },
  { href: "/admin/rounds", label: "Rounds", icon: ListChecks },
  { href: "/admin/matches", label: "Matches", icon: ClipboardList },
  { href: "/admin/results", label: "Results", icon: Medal },
  { href: "/admin/players", label: "Players", icon: Users },
  { href: "/admin/predictions", label: "Winner Challenge", icon: ClipboardList },
  { href: "/admin/leaderboards", label: "Leaderboards", icon: Medal },
  { href: "/admin/referrals", label: "Referrals", icon: Network },
  { href: "/admin/rewards", label: "Rewards", icon: Gift },
  { href: "/admin/email-settings", label: "Email Settings", icon: Mail },
  { href: "/admin/audit", label: "Audit", icon: FileClock },
];

export async function AdminLayout({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  await requireAdminPasswordAccess(active);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 md:grid md:grid-cols-[260px_1fr]">
      <aside className="flex flex-col bg-[#071525] p-4 text-white">
        <Link href="/fifa-last-32" className="mb-6 flex items-center gap-2 font-black">
          <span className="grid size-9 place-items-center rounded bg-[#d71920]">
            ⚽
          </span>
          Brainwave AI Admin Console
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
        <div className="mt-6 border-t border-white/10 pt-4 md:mt-auto">
          <form action="/api/admin-logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded bg-[#d71920] px-3 py-2 text-sm font-black text-white hover:bg-red-700"
            >
              <LogOut size={16} />
              Logout Admin
            </button>
          </form>
          <Link
            href="/game"
            className="mt-2 flex w-full items-center justify-center rounded bg-white/10 px-3 py-2 text-xs font-bold text-white/75 hover:bg-white/15 hover:text-white"
          >
            Back to Game
          </Link>
        </div>
      </aside>
      <main className="p-4 md:p-8">{children}</main>
    </div>
  );
}
