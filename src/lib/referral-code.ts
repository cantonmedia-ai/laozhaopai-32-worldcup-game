export const referralStorageKey = "laozhaopai_referral_code";

export function cleanReferralCode(value: string | null | undefined) {
  const code = value?.trim().toUpperCase() ?? "";
  return /^[A-Z0-9_-]{3,32}$/.test(code) ? code : "";
}
