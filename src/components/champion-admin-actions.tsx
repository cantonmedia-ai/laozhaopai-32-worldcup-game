"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PlayerDisqualifyButton({
  playerId,
  isDisqualified,
}: {
  playerId: string;
  isDisqualified: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function update() {
    const next = !isDisqualified;
    const note = next ? window.prompt("Admin note for disqualification", "") : "";
    setLoading(true);
    await fetch("/api/admin/disqualify-player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, isDisqualified: next, adminNote: note }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={update}
      className={`rounded-lg px-3 py-2 text-xs font-black ${
        isDisqualified ? "bg-[#128c4a] text-white" : "bg-[#d71920] text-white"
      } disabled:opacity-60`}
    >
      {loading ? "Saving..." : isDisqualified ? "Restore" : "Disqualify"}
    </button>
  );
}

export function WinnerStatusButton({
  winnerId,
  status,
}: {
  winnerId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function update(nextStatus: string) {
    const adminNote = nextStatus === "prize_collected" ? window.prompt("Collection note", "") : "";
    setLoading(true);
    await fetch("/api/admin/winner-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winnerId, status: nextStatus, adminNote }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={loading || status === "contacted"}
        onClick={() => update("contacted")}
        className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black disabled:opacity-50"
      >
        Contacted
      </button>
      <button
        type="button"
        disabled={loading || status === "prize_collected"}
        onClick={() => update("prize_collected")}
        className="rounded-lg bg-[#128c4a] px-3 py-2 text-xs font-black text-white disabled:opacity-50"
      >
        Prize Collected
      </button>
    </div>
  );
}

export function ResultConfirmForm({
  champion,
  resultConfirmed,
  countries,
}: {
  champion: string | null;
  resultConfirmed: boolean;
  countries: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(champion ?? "");
  const [confirmed, setConfirmed] = useState(resultConfirmed);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    if (!selected) {
      setMessage("Please select champion country.");
      return;
    }
    if (confirmed && !window.confirm("Once result is confirmed, winners will be generated. Are you sure?")) {
      return;
    }
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        official_champion_country: selected,
        result_confirmed: confirmed,
      }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(result?.error ?? "Unable to save result.");
      return;
    }
    setMessage("Result saved and winners recalculated.");
    router.refresh();
  }

  async function recalculate() {
    setLoading(true);
    const response = await fetch("/api/admin/recalculate-winners", { method: "POST" });
    setLoading(false);
    setMessage(response.ok ? "Winners recalculated." : "Unable to recalculate winners.");
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <h2 className="text-2xl font-black">Official Champion</h2>
      <div className="mt-4 grid gap-4">
        <label className="grid gap-2 text-sm font-black">
          Champion Country
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-base"
          >
            <option value="">Select country</option>
            {countries.map((countryName) => (
              <option key={countryName} value={countryName}>
                {countryName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-xl bg-yellow-50 p-4 font-black">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          Confirm result and generate winners
        </label>
        {message ? <div className="rounded-lg bg-slate-100 p-3 text-sm font-bold">{message}</div> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={loading}
            onClick={submit}
            className="rounded-xl bg-[#d71920] px-5 py-3 font-black text-white disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Result"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={recalculate}
            className="rounded-xl bg-[#071525] px-5 py-3 font-black text-white disabled:opacity-60"
          >
            Recalculate Winners
          </button>
        </div>
      </div>
    </div>
  );
}
