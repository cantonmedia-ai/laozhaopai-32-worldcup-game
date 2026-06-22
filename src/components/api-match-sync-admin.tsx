"use client";

import { useState } from "react";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";

type FixtureRow = {
  round: string;
  apiFixtureId: string;
  teamA: { name: string; shortName: string; crest?: string };
  teamB: { name: string; shortName: string; crest?: string };
  matchDateTime: string;
  apiStatus: string;
  publishStatus: string;
};

type StandingRow = {
  stage: string;
  group: string;
  rows: Array<{
    position: number;
    team: { name: string; shortName: string };
    playedGames: number;
    points: number;
  }>;
};

type SyncResponse = {
  message?: string;
  fixtures?: FixtureRow[];
  standings?: StandingRow[];
};

export function ApiMatchSyncAdmin() {
  const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function sync(action: "standings" | "fixtures") {
    setBusy(action);
    setMessage("");

    try {
      const response = await fetch(`/api/football-sync-admin?action=${action}`);
      const data = (await response.json()) as SyncResponse;
      if (!response.ok) throw new Error(data.message ?? "Unable to sync API data.");

      setMessage(data.message ?? "API data loaded for admin review.");
      if (action === "fixtures") setFixtures(data.fixtures ?? []);
      if (action === "standings") setStandings(data.standings ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sync API data.");
    } finally {
      setBusy("");
    }
  }

  async function publish() {
    setBusy("publish");
    setMessage("");

    try {
      const response = await fetch("/api/football-sync-admin", { method: "POST" });
      const data = (await response.json()) as SyncResponse;
      setMessage(
        data.message ??
          "Auto-publish is disabled. Please review fixtures before publishing.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Auto-publish is disabled. Please review fixtures before publishing.",
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="card mt-6 p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0f8a4b]">
            API Match Sync
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            API fetch → Admin review → Publish
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">
            Round of 32 fixtures can be detected from the football API, but they
            are not published to players automatically. Admin must review before
            opening Game 2 and Game 3 predictions.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[420px]">
          <button
            type="button"
            onClick={() => sync("standings")}
            disabled={Boolean(busy)}
            className="flex h-11 items-center justify-center gap-2 rounded bg-slate-100 px-3 text-sm font-black text-slate-800 disabled:opacity-60"
          >
            {busy === "standings" ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Sync Group Standings
          </button>
          <button
            type="button"
            onClick={() => sync("fixtures")}
            disabled={Boolean(busy)}
            className="flex h-11 items-center justify-center gap-2 rounded bg-[#071525] px-3 text-sm font-black text-white disabled:opacity-60"
          >
            {busy === "fixtures" ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Sync Round of 32 Fixtures
          </button>
          <button
            type="button"
            onClick={() => sync("fixtures")}
            disabled={Boolean(busy)}
            className="flex h-11 items-center justify-center rounded bg-[#f4c542] px-3 text-sm font-black text-[#071525] disabled:opacity-60"
          >
            Review Detected Fixtures
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={Boolean(busy)}
            className="flex h-11 items-center justify-center gap-2 rounded bg-[#d71920] px-3 text-sm font-black text-white disabled:opacity-60"
          >
            {busy === "publish" ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
            Confirm & Publish Round
          </button>
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded bg-yellow-50 p-3 text-sm font-bold text-yellow-900">
          {message}
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="p-3">Round</th>
              <th className="p-3">API Fixture ID</th>
              <th className="p-3">Team A</th>
              <th className="p-3">Team B</th>
              <th className="p-3">Match Date/Time</th>
              <th className="p-3">API Status</th>
              <th className="p-3">Publish Status</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.length ? (
              fixtures.map((fixture) => (
                <tr key={fixture.apiFixtureId} className="border-t border-slate-100">
                  <td className="p-3 font-black">{fixture.round}</td>
                  <td className="p-3">{fixture.apiFixtureId}</td>
                  <td className="p-3">{fixture.teamA.name}</td>
                  <td className="p-3">{fixture.teamB.name}</td>
                  <td className="p-3">
                    {fixture.matchDateTime
                      ? new Date(fixture.matchDateTime).toLocaleString("en-MY")
                      : "-"}
                  </td>
                  <td className="p-3 font-black text-[#0f8a4b]">
                    {fixture.apiStatus}
                  </td>
                  <td className="p-3">{fixture.publishStatus}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-4 text-center font-bold text-slate-500">
                  No Round of 32 fixtures detected yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {standings.length ? (
        <div className="mt-5 rounded bg-slate-100 p-4 text-sm font-bold text-slate-700">
          Group standings synced for admin review: {standings.length} table(s).
        </div>
      ) : null}
    </section>
  );
}
