"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { applyStoredReferralCode } from "@/lib/referrals";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/game";
  return value;
}

function createReferralCode() {
  return `LZP${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function isProfileComplete(profile: {
  profile_completed: boolean | null;
  display_name: string | null;
  nickname: string | null;
  phone: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
} | null) {
  return Boolean(
    profile?.profile_completed &&
      (profile.display_name || profile.nickname) &&
      (profile.phone || profile.phone_number || profile.whatsapp_number),
  );
}

function friendlyExchangeError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("code verifier") ||
    lowerMessage.includes("pkce")
  ) {
    return "Google login expired. Please start again from the login page.";
  }

  return message || "Google login failed. Please try again.";
}

export function AuthFinishClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);
  const message = "Completing Google login...";

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function finishLogin() {
      const code = searchParams.get("code");
      const nextPath = safeNextPath(searchParams.get("next"));

      if (!isSupabaseConfigured()) {
        router.replace(`/profile-setup?demo=1&next=${encodeURIComponent(nextPath)}`);
        return;
      }

      if (!code) {
        router.replace(
          `/login?error=${encodeURIComponent("Login link is missing a code. Please try again.")}`,
        );
        return;
      }

      try {
        const supabase = createClient({
          auth: {
            detectSessionInUrl: false,
          },
        });
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          throw new Error(friendlyExchangeError(exchangeError.message));
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Login session not found. Please try again.");
        }

        const provider = user.app_metadata?.provider
          ? String(user.app_metadata.provider)
          : "google";
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, profile_completed, display_name, nickname, phone, phone_number, whatsapp_number",
          )
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (profileError) throw new Error(profileError.message);

        if (!profile) {
          const { error: insertError } = await supabase.from("profiles").insert({
            auth_user_id: user.id,
            user_id: user.id,
            email: user.email,
            avatar_url: user.user_metadata?.avatar_url ?? null,
            login_provider: provider,
            provider,
            auth_provider: provider,
            referral_code: createReferralCode(),
            profile_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (insertError) throw new Error(insertError.message);

          await applyStoredReferralCode();
          router.replace(`/profile-setup?next=${encodeURIComponent(nextPath)}`);
          return;
        }

        await applyStoredReferralCode();

        if (!isProfileComplete(profile)) {
          router.replace(`/profile-setup?next=${encodeURIComponent(nextPath)}`);
          return;
        }

        router.replace(nextPath);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Google login failed. Please try again.";
        router.replace(`/login?error=${encodeURIComponent(errorMessage)}`);
      }
    }

    finishLogin();
  }, [router, searchParams]);

  return (
    <p className="mt-6 flex items-center justify-center gap-2 rounded bg-white/10 p-3 text-sm font-bold text-white/80">
      <Loader2 className="animate-spin" size={16} />
      {message}
    </p>
  );
}
