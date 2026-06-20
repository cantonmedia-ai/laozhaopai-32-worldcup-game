"use client";

import { useState } from "react";
import { Apple, CircleUserRound, Loader2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthProvider = "google" | "apple";

const providerLabels: Record<AuthProvider, string> = {
  google: "Google",
  apple: "Apple",
};

function getRedirectOrigin() {
  if (window.location.hostname === "games.brainwaveai.my") {
    return window.location.origin;
  }

  if (window.location.hostname.endsWith(".vercel.app")) {
    return "https://games.brainwaveai.my";
  }

  return window.location.origin;
}

export function AuthButtons({ next = "/game" }: { next?: string }) {
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | "">("");
  const [errorMessage, setErrorMessage] = useState("");

  async function signIn(provider: AuthProvider) {
    setLoadingProvider(provider);
    setErrorMessage("");

    try {
      if (!isSupabaseConfigured()) {
        window.location.href = `/setup-profile?demo=1&next=${encodeURIComponent(next)}`;
        return;
      }

      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", getRedirectOrigin());
      redirectTo.searchParams.set("next", next);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectTo.toString(),
          queryParams:
            provider === "google"
              ? {
                  access_type: "offline",
                  prompt: "consent",
                }
              : undefined,
        },
      });

      if (error) throw new Error(error.message);
    } catch (error) {
      setLoadingProvider("");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : `${providerLabels[provider]} login failed.`,
      );
    }
  }

  function buttonLabel(provider: AuthProvider) {
    if (loadingProvider === provider) return "正在前往登录...";
    return `${providerLabels[provider]} 登录`;
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        disabled={Boolean(loadingProvider)}
        onClick={() => signIn("google")}
        className="flex h-12 items-center justify-center gap-2 rounded bg-white px-4 font-black text-slate-950 shadow hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
      >
        {loadingProvider === "google" ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <CircleUserRound size={18} />
        )}
        {buttonLabel("google")}
      </button>
      <button
        type="button"
        disabled={Boolean(loadingProvider)}
        onClick={() => signIn("apple")}
        className="flex h-12 items-center justify-center gap-2 rounded bg-black px-4 font-black text-white shadow hover:bg-slate-900 disabled:cursor-wait disabled:opacity-70"
      >
        {loadingProvider === "apple" ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <Apple size={18} />
        )}
        {buttonLabel("apple")}
      </button>
      {errorMessage ? (
        <p className="rounded bg-red-50 p-3 text-center text-xs font-bold text-red-700">
          {errorMessage}
        </p>
      ) : null}
      {!isSupabaseConfigured() ? (
        <p className="rounded bg-amber-50 p-3 text-center text-xs font-bold text-amber-900">
          Login setup needed: add the Supabase URL and anon key in Vercel to enable Google / Apple.
        </p>
      ) : null}
    </div>
  );
}
