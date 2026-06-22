import { Suspense } from "react";
import { AuthFinishClient } from "@/components/auth-finish-client";

export default function AuthFinishPage() {
  return (
    <main className="stadium-hero grid min-h-screen place-items-center px-4 text-white">
      <div className="w-full max-w-md rounded-lg border border-white/15 bg-[#071525]/85 p-6 text-center shadow-2xl backdrop-blur">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-[#f4c542]">
          Knockout Challenge
        </p>
        <h1 className="mt-5 text-3xl font-black">Finishing Login</h1>
        <p className="mt-2 text-white/70">
          Please wait while we securely complete your Google sign in.
        </p>
        <Suspense
          fallback={
            <p className="mt-6 rounded bg-white/10 p-3 text-sm font-bold text-white/80">
              Checking your account...
            </p>
          }
        >
          <AuthFinishClient />
        </Suspense>
      </div>
    </main>
  );
}
