"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import clsx from "clsx";
import { CHAMPION_COUNTRIES, type ChampionCountry } from "@/lib/champion-guess";

export function ChampionJoinForm() {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState<ChampionCountry | null>(null);
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredCountries = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return CHAMPION_COUNTRIES;
    return CHAMPION_COUNTRIES.filter(
      (item) =>
        item.name.toLowerCase().includes(value) ||
        item.code.toLowerCase().includes(value) ||
        item.group.toLowerCase().includes(value),
    );
  }, [query]);

  function validate() {
    if (!name.trim()) return "Please enter your name.";
    if (!whatsapp.trim()) return "Please enter your WhatsApp number.";
    if (!country) return "Please select your champion country.";
    return "";
  }

  async function submit() {
    const validation = validate();
    if (validation) {
      setError(validation);
      setConfirming(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          whatsapp,
          email,
          selected_country: country?.name,
          selected_country_code: country?.code,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Submission failed. Please try again.");
      }

      window.location.href = `/join/success?id=${encodeURIComponent(result.playerId)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <section className="rounded-2xl bg-white p-5 text-[#071525] shadow-2xl shadow-black/20">
        <div className="rounded-xl bg-[#071525] p-4 text-white">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-[#f4c542]">
            Champion Guess 2026
          </div>
          <h1 className="mt-2 text-3xl font-black">Pick Your Champion</h1>
          <p className="mt-2 text-sm text-white/75">
            Choose one country. One WhatsApp number can only join once.
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-black">
            Full Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-lg border border-slate-200 px-4 py-3 text-base"
              placeholder="Deric"
            />
          </label>
          <label className="grid gap-2 text-sm font-black">
            WhatsApp Number
            <input
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              className="rounded-lg border border-slate-200 px-4 py-3 text-base"
              placeholder="0123456789"
              inputMode="tel"
            />
          </label>
          <label className="grid gap-2 text-sm font-black">
            Email <span className="font-bold text-slate-400">optional</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-lg border border-slate-200 px-4 py-3 text-base"
              placeholder="player@email.com"
              inputMode="email"
            />
          </label>

          <div className="rounded-xl border border-[#f4c542]/40 bg-yellow-50 p-4">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6a00]">
              Your Pick
            </div>
            <div className="mt-2 text-2xl font-black">
              {country ? `${country.flag} ${country.name}` : "No champion selected"}
            </div>
          </div>

          {error ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>
          ) : null}

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              const validation = validate();
              if (validation) {
                setError(validation);
                return;
              }
              setConfirming(true);
            }}
            className="rounded-xl bg-[#d71920] px-5 py-4 text-lg font-black text-white shadow-lg shadow-red-700/20 disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Confirm My Champion"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-[#06111f] p-4 shadow-2xl shadow-black/20">
        <div className="sticky top-[76px] z-10 bg-[#06111f] pb-3">
          <label className="relative block">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white px-10 py-3 text-[#071525]"
              placeholder="Search country or group"
            />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {filteredCountries.map((item) => {
            const selected = country?.code === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setCountry(selected ? null : item)}
                className={clsx(
                  "flex items-center gap-3 rounded-xl border p-3 text-left",
                  selected
                    ? "border-[#f4c542] bg-[#f4c542]/15 shadow-lg shadow-yellow-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10",
                )}
              >
                <span className="text-3xl">{item.flag}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-black text-white">{item.name}</span>
                  <span className="text-xs font-bold text-slate-400">
                    {item.group} · {item.code}
                  </span>
                </span>
                <span
                  className={clsx(
                    "grid size-7 shrink-0 place-items-center rounded-full border",
                    selected ? "border-[#f4c542] bg-[#f4c542] text-[#071525]" : "border-white/30",
                  )}
                >
                  {selected ? <Check size={16} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {confirming ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 text-[#071525] shadow-2xl">
            <div className="text-sm font-black uppercase tracking-[0.22em] text-[#128c4a]">
              Final Check
            </div>
            <h2 className="mt-2 text-3xl font-black">Submit Now?</h2>
            <p className="mt-3 text-slate-600">
              You selected <strong>{country?.name}</strong> as FIFA 2026 Champion. After
              submission, you cannot change your answer.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirming(false)}
                className="rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-700"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={submit}
                className="rounded-xl bg-[#d71920] px-4 py-3 font-black text-white disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Now"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
