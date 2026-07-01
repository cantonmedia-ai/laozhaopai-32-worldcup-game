import Link from "next/link";
import clsx from "clsx";

const navItems = [
  { href: "/fifa-champion-guess", label: "首页" },
  { href: "/join", label: "参加游戏" },
  { href: "/prizes", label: "奖品" },
  { href: "/players", label: "参与名单" },
  { href: "/results", label: "开奖结果" },
  { href: "/admin-login", label: "Admin" },
];

export function ChampionShell({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#071525] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071525]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/fifa-champion-guess" className="flex min-w-0 items-center gap-2">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#d71920] text-lg">
              ⚽
            </span>
            <span className="truncate text-base font-black md:text-xl">Brainwave Games</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded-lg px-3 py-2 text-sm font-black",
                  active === item.href
                    ? "bg-[#f4c542] text-[#071525]"
                    : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/join"
            className="rounded-lg bg-[#f4c542] px-3 py-2 text-sm font-black text-[#071525] shadow-lg shadow-yellow-500/20"
          >
            Join Now
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="px-4 pb-24 pt-10 text-center text-xs leading-6 text-slate-400 md:pb-8">
        <div>© 2026 Brainwave Games</div>
        <div>Powered by Brainwave AI</div>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-slate-200 bg-white text-[#071525] shadow-2xl md:hidden">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "py-3 text-center text-[11px] font-black",
              active === item.href ? "text-[#d71920]" : "text-slate-600",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone = "light",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "light" | "gold" | "green" | "dark";
}) {
  const styles = {
    light: "bg-white text-[#071525]",
    gold: "bg-[#f4c542] text-[#071525]",
    green: "bg-[#128c4a] text-white",
    dark: "bg-[#06111f] text-white",
  };

  return (
    <div className={clsx("rounded-xl p-5 shadow-xl shadow-black/10", styles[tone])}>
      <div className="text-sm font-black opacity-70">{label}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}
