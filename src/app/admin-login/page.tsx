import Link from "next/link";
import { AdminLoginForm } from "@/components/admin-login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/admin";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
      <div className="mx-auto mb-6 flex max-w-md items-center justify-between">
        <Link href="/game" className="text-sm font-black text-slate-600 hover:text-slate-950">
          Back to game
        </Link>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Admin
        </span>
      </div>
      <AdminLoginForm next={next} />
    </main>
  );
}
