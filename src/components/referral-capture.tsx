"use client";

import { useEffect } from "react";
import { cleanReferralCode, referralStorageKey } from "@/lib/referral-code";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function ReferralCapture() {
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const incomingRef = cleanReferralCode(params.get("ref"));

    if (incomingRef) {
      localStorage.setItem(referralStorageKey, incomingRef);
      document.cookie = `${referralStorageKey}=${encodeURIComponent(
        incomingRef,
      )}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }

    async function acceptReferralForLoggedInPlayer() {
      const referralCode =
        incomingRef || cleanReferralCode(localStorage.getItem(referralStorageKey));

      if (!referralCode || !isSupabaseConfigured()) return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) return;

      const { error } = await supabase.rpc("accept_referral", {
        p_referral_code: referralCode,
      });

      if (!cancelled && !error) {
        localStorage.removeItem(referralStorageKey);
        document.cookie = `${referralStorageKey}=; path=/; max-age=0; SameSite=Lax`;
      }
    }

    acceptReferralForLoggedInPlayer().catch(() => {
      // Keep the stored code so profile setup or the next signed-in page can retry.
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
