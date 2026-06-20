import { referralStorageKey } from "@/components/referral-capture";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function getStoredReferralCode() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(referralStorageKey) ?? "";
}

export function clearStoredReferralCode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(referralStorageKey);
  document.cookie = `${referralStorageKey}=; path=/; max-age=0; SameSite=Lax`;
}

export async function applyStoredReferralCode() {
  const referralCode = getStoredReferralCode();
  if (!referralCode || !isSupabaseConfigured()) return false;

  const supabase = createClient();
  const { error } = await supabase.rpc("accept_referral", {
    p_referral_code: referralCode,
  });

  if (error) throw new Error(error.message);

  clearStoredReferralCode();
  return true;
}
