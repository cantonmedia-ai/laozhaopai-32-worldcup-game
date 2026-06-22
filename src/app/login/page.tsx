import Link from "next/link";
import { AuthButtons } from "@/components/auth-buttons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const initialMode = params.mode === "signup" ? "signup" : "login";

  return (
    <main className="stadium-hero grid min-h-screen place-items-center px-4 text-white">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-white/15 bg-[#071525]/85 p-6 shadow-2xl backdrop-blur">
          <Link href="/" className="font-black text-[#f4c542]">
            Knockout Challenge
          </Link>
          <h1 className="mt-5 text-3xl font-black">Sign In to Play</h1>
          <p className="mt-2 text-white/70">
            Already signed up? Sign in with Google or email. New players can
            switch to Sign Up and join in one step.
          </p>
          {params.error ? (
            <p className="mt-4 rounded bg-red-50 p-3 text-sm font-bold text-red-700">
              {params.error}
            </p>
          ) : null}
          <div className="mt-6">
            <AuthButtons next={params.next ?? "/game"} initialMode={initialMode} />
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-white/55">
          Powered by Brainwave AI
        </p>
      </div>
    </main>
  );
}
