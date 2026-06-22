"use client";

import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";

export function VerifyEmailCard({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function resend() {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/email/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) throw new Error(result?.error || "Unable to send verification email.");
      setMessage("Verification email sent. Please check your inbox.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to send verification email.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="card grid gap-5 p-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#f4c542] text-[#071525]">
          <MailCheck size={28} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#0f8a4b]">
            Email Verification
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Check your email
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            We sent a verification link to <span className="font-black text-slate-950">{email}</span>.
            Please verify your email before entering the game.
          </p>
        </div>
        <button
          type="button"
          onClick={resend}
          disabled={loading}
          className="flex h-12 items-center justify-center gap-2 rounded bg-[#d71920] px-4 font-black text-white shadow-lg shadow-red-900/20 hover:bg-red-700 disabled:cursor-wait disabled:bg-slate-400"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : null}
          {loading ? "Sending..." : "Resend verification email"}
        </button>
        <p className="text-xs font-bold text-slate-500">
          Already verified? Refresh this page after clicking the email link.
        </p>
        {message ? (
          <p className="rounded bg-green-50 p-3 text-xs font-bold text-green-700">
            {message}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="rounded bg-red-50 p-3 text-xs font-bold text-red-700">
            {errorMessage}
          </p>
        ) : null}
      </div>
      <p className="mt-6 text-center text-xs font-semibold text-slate-400">
        Powered by Brainwave AI
      </p>
    </div>
  );
}
