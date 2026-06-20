"use client";

import { useEffect } from "react";

export const referralStorageKey = "laozhaopai_referral_code";

export function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");

    if (ref && /^[a-zA-Z0-9_-]{3,32}$/.test(ref)) {
      localStorage.setItem(referralStorageKey, ref.toUpperCase());
      document.cookie = `${referralStorageKey}=${encodeURIComponent(
        ref.toUpperCase(),
      )}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
  }, []);

  return null;
}
