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

function createReferralCode() {
  return `LZP${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function SetupProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [nickname, setNickname] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const storedReferralCode = getStoredReferralCode();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = nickname.trim();
    const cleanWhatsapp = whatsappNumber.replace(/[\s-]/g, "");

    if (!cleanName) {
      setMessage("Please enter your nickname.");
      return;
    }

    if (cleanName.length < 2 || cleanName.length > 20) {
      setMessage("Nickname must be 2 to 20 characters.");
      return;
    }

    if (isEmailLike(cleanName)) {
      setMessage("Nickname cannot be an email address.");
      return;
    }

    if (!cleanWhatsapp) {
      setMessage("Please enter your WhatsApp number.");
      return;
    }

    if (!isValidWhatsApp(cleanWhatsapp)) {
      setMessage("Enter a valid WhatsApp number, for example 60123456789, +60123456789, or 0123456789.");
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

      if (!user) throw new Error("Please sign in first.");

      const profilePayload = {
        auth_user_id: user.id,
        user_id: user.id,
        email: user.email,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        login_provider: user.app_metadata?.provider
          ? String(user.app_metadata.provider)
          : "oauth",
        provider: user.app_metadata?.provider
          ? String(user.app_metadata.provider)
          : "oauth",
        auth_provider: user.app_metadata?.provider
          ? String(user.app_metadata.provider)
          : "email",
        display_name: cleanName,
        nickname: cleanName,
        phone: cleanWhatsapp,
        phone_number: cleanWhatsapp,
        whatsapp_number: cleanWhatsapp,
        profile_completed: true,
        display_name_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update(profilePayload)
        .eq("auth_user_id", user.id)
        .select("id")
        .maybeSingle();

      if (updateError) throw new Error(updateError.message);

      if (!updatedProfile) {
        const { error: insertError } = await supabase.from("profiles").insert({
          ...profilePayload,
          referral_code: createReferralCode(),
          created_at: new Date().toISOString(),
        });

        if (insertError) throw new Error(insertError.message);
      }

      await applyStoredReferralCode();
      router.push(nextPath);
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
          Invite code detected: {storedReferralCode}. Your squad link will be recorded after setup.
        </div>
      ) : null}

      <label className="grid gap-2 font-bold">
        Nickname
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          className="h-12 rounded border border-slate-200 px-3 font-semibold"
          placeholder="Your leaderboard name"
          minLength={2}
          maxLength={20}
          required
        />
      </label>

      <label className="grid gap-2 font-bold">
        WhatsApp Number
        <input
          value={whatsappNumber}
          onChange={(event) => setWhatsappNumber(event.target.value)}
          className="h-12 rounded border border-slate-200 px-3 font-semibold"
          placeholder="60123456789"
          required
        />
        <span className="text-xs font-bold text-slate-500">
          WhatsApp number is only used for prize notification.
        </span>
      </label>

      <button
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
