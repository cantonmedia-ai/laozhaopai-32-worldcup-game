"use client";

import { useEffect, useState } from "react";
import { cleanReferralCode } from "@/lib/referral-code";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { stageInlineName } from "@/lib/stage-labels";

export function ReferralInviteBanner() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const referralCode = cleanReferralCode(params.get("ref"));

    if (!referralCode || !isSupabaseConfigured()) return;

    async function loadReferrer() {
      const supabase = createClient();
      const { data } = await supabase.rpc("get_referrer_public", {
        p_referral_code: referralCode,
      });

      const nickname = Array.isArray(data)
        ? data[0]?.nickname
        : data?.nickname;

      if (nickname) {
        setMessage(
          `You were invited by ${nickname}. Join the FIFA ${stageInlineName("last_32")} game now.`,
        );
      }
    }

    loadReferrer().catch(() => {
      // Invalid or private codes should not interrupt the public page.
    });
  }, []);

  if (!message) return null;

  return (
    <div className="mb-4 rounded bg-[#f4c542] p-3 text-sm font-black text-[#071525] shadow">
      {message}
    </div>
  );
}
