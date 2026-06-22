"use client";

import { useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";

export function AdminLoginForm({ next = "/admin" }: { next?: string }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, next }),
      });
      const result = (await response.json().catch(() => null)) as {
        next?: string;
        error?: string;
      } | null;

      if (!response.ok) throw new Error(result?.error || "Wrong admin password.");
      window.location.href = result?.next || "/admin";
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Wrong admin password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto grid max-w-md gap-4 p-6">
      <div className="text-center">
        <div className="mx-auto grid size-12 place-items-center rounded bg-[#f4c542] text-[#071525]">
          <LockKeyhole size={24} />
        </div>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-[#0f8a4b]">
          Admin Access
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          Enter Admin Password
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Use the admin password to open Brainwave AI Admin Console.
        </p>
      </div>
      <label className="grid gap-1.5 text-sm font-black text-slate-700">
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-12 rounded border border-slate-200 bg-white px-3 font-semibold text-slate-950 outline-none focus:border-[#d71920]"
          placeholder="Enter password"
          autoComplete="current-password"
          required
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="flex h-12 items-center justify-center gap-2 rounded bg-[#d71920] px-4 font-black text-white shadow-lg shadow-red-900/20 hover:bg-red-700 disabled:cursor-wait disabled:bg-slate-400"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : null}
        {loading ? "Checking..." : "Enter Admin"}
      </button>
      {errorMessage ? (
        <p className="rounded bg-red-50 p-3 text-center text-xs font-bold text-red-700">
          {errorMessage}
        </p>
      ) : null}
      <p className="text-center text-xs font-semibold text-slate-400">
        Powered by Brainwave AI
      </p>
    </form>
  );
}
