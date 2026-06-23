"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyStoredReferralCode, getStoredReferralCode } from "@/lib/referrals";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidWhatsApp(value: string) {
  const cleanValue = value.replace(/[\s-]/g, "");
  return /^(\+?60\d{8,10}|0\d{8,10})$/.test(cleanValue);
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/game";
  return value;
}

export function SetupProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [displayName, setDisplayName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<"zh" | "en">("zh");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const storedReferralCode = getStoredReferralCode();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = displayName.trim();
    const cleanMobile = mobileNumber.replace(/[\s-]/g, "");

    if (!cleanName) {
      setMessage("Please enter your display name.");
      return;
    }

    if (cleanName.length < 2 || cleanName.length > 30) {
      setMessage("Display name must be 2 to 30 characters.");
      return;
    }

    if (isEmailLike(cleanName)) {
      setMessage("Display name cannot be an email address.");
      return;
    }

    if (cleanMobile && !isValidWhatsApp(cleanMobile)) {
      setMessage("Enter a valid mobile number, for example 60123456789, +60123456789, or 0123456789.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      if (!isSupabaseConfigured()) {
        router.push(nextPath);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      setMessage("Saving your player profile...");

      const { error: saveError } = await supabase.rpc(
        "complete_player_profile",
        {
          p_nickname: cleanName,
          p_whatsapp_number: cleanMobile || null,
          p_preferred_language: preferredLanguage,
        },
      );

      if (saveError) throw new Error(saveError.message);

      await applyStoredReferralCode();
      window.location.assign(nextPath);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card grid gap-4 p-5">
      {storedReferralCode ? (
        <div className="rounded bg-green-50 p-3 text-sm font-bold text-green-800">
          Invite code detected: {storedReferralCode}. Your team link will be recorded after setup.
        </div>
      ) : null}

      <label className="grid gap-2 font-bold">
        Display Name
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="h-12 rounded border border-slate-200 px-3 font-semibold"
          placeholder="Your leaderboard name"
          minLength={2}
          maxLength={30}
          required
        />
      </label>

      <label className="grid gap-2 font-bold">
        Mobile Number <span className="text-xs text-slate-500">(optional)</span>
        <input
          value={mobileNumber}
          onChange={(event) => setMobileNumber(event.target.value)}
          className="h-12 rounded border border-slate-200 px-3 font-semibold"
          placeholder="60123456789"
        />
        <span className="text-xs font-bold text-slate-500">
          Mobile number is only used for prize notification if you win.
        </span>
      </label>

      <label className="grid gap-2 font-bold">
        Preferred Language
        <select
          value={preferredLanguage}
          onChange={(event) => setPreferredLanguage(event.target.value as "zh" | "en")}
          className="h-12 rounded border border-slate-200 px-3 font-semibold"
          required
        >
          <option value="zh">Chinese</option>
          <option value="en">English</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={saving}
        className="h-12 rounded bg-[#d71920] font-black text-white hover:bg-red-700 disabled:bg-slate-400"
      >
        {saving ? "Saving..." : "Start Playing"}
      </button>

      {message ? (
        <p className="rounded bg-slate-100 p-3 text-sm font-bold text-slate-700">
          {message}
        </p>
      ) : null}
    </form>
  );
}
