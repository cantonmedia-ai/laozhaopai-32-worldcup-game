"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, RadioTower } from "lucide-react";

type ScoreboardMatch = {
  id: string;
  utcDate: string;
  status: string;
  minute: number | null;
  stage: string;
  group: string;
  homeTeam: {
    name: string;
    shortName: string;
    crest?: string;
  };
  awayTeam: {
    name: string;
    shortName: string;
    crest?: string;
  };
  score: {
    home: number | null;
    away: number | null;
    halfHome: number | null;
    halfAway: number | null;
  };
};

type ScoreboardResponse = {
  source: "live" | "fallback";
  provider: string;
  updatedAt: string;
  message?: string;
  matches: ScoreboardMatch[];
};

const initialState: ScoreboardResponse = {
  source: "fallback",
  provider: "Football-Data.org",
  updatedAt: new Date().toISOString(),
  matches: [],
};

function statusText(match: ScoreboardMatch) {
  if (match.status === "IN_PLAY" || match.status === "LIVE") {
    return match.minute ? `${match.minute}' Live` : "Live";
  }

  if (match.status === "PAUSED") return "Half-time";
  if (match.status === "FINISHED") return "Full-time";
  if (match.status === "POSTPONED") return "Postponed";
  if (match.status === "CANCELLED") return "Cancelled";
  return "Scheduled";
}

function matchDate(value: string) {
  if (!value) return "TBC";

  return new Intl.DateTimeFormat("en-MY", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function scoreLabel(value: number | null) {
  return typeof value === "number" ? value : "-";
}

export function LiveScoreboard() {
  const [data, setData] = useState<ScoreboardResponse>(initialState);
  const [loading, setLoading] = useState(true);

  async function loadScores() {
    try {
      const response = await fetch("/api/live-scoreboard", {
        cache: "no-store",
      });
      const nextData = (await response.json()) as ScoreboardResponse;
      setData(nextData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadScores();
    const timer = window.setInterval(loadScores, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const liveCount = useMemo(
    () =>
      data.matches.filter((match) =>
        ["LIVE", "IN_PLAY", "PAUSED"].includes(match.status),
      ).length,
    [data.matches],
  );

  return (
    <section className="bg-[#071525] px-4 py-6 text-white md:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 rounded bg-white/10 px-3 py-1 text-xs font-black text-[#f4c542]">
              <RadioTower size={14} /> Live Scoreboard
            </p>
            <h2 className="mt-3 text-2xl font-black md:text-4xl">
              FIFA match scores
            </h2>
          </div>
          <div className="flex items-center gap-2 rounded bg-white/10 px-3 py-2 text-xs font-bold text-white/75">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Auto refresh 60s · {data.provider}
          </div>
        </div>

        {data.message ? (
          <p className="mb-4 rounded bg-amber-50 p-3 text-sm font-bold text-amber-950">
            {data.message}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-white/10 bg-white text-slate-950 shadow-2xl">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-black text-slate-700">
              <Activity size={16} className="text-[#d71920]" />
              {liveCount ? `${liveCount} live now` : "Latest fixtures and results"}
            </div>
            <p className="text-right text-xs font-bold text-slate-500">
              Updated {matchDate(data.updatedAt)}
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {data.matches.length ? (
              data.matches.map((match) => (
                <div
                  key={match.id}
                  className="grid gap-3 px-4 py-4 md:grid-cols-[120px_1fr_92px_1fr_120px] md:items-center"
                >
                  <div className="text-xs font-black text-slate-500">
                    <p>{statusText(match)}</p>
                    <p className="mt-1 font-bold text-slate-400">
                      {matchDate(match.utcDate)}
                    </p>
                  </div>

                  <div className="flex min-w-0 items-center gap-2">
                    {match.homeTeam.crest ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={match.homeTeam.crest}
                        alt=""
                        className="size-7 shrink-0 object-contain"
                      />
                    ) : null}
                    <span className="truncate font-black">
                      {match.homeTeam.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center rounded bg-slate-100 px-3 py-2 text-center text-2xl font-black">
                    <span>{scoreLabel(match.score.home)}</span>
                    <span className="px-2 text-sm text-slate-400">:</span>
                    <span>{scoreLabel(match.score.away)}</span>
                  </div>

                  <div className="flex min-w-0 items-center gap-2 md:justify-end">
                    <span className="truncate font-black">
                      {match.awayTeam.name}
                    </span>
                    {match.awayTeam.crest ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={match.awayTeam.crest}
                        alt=""
                        className="size-7 shrink-0 object-contain"
                      />
                    ) : null}
                  </div>

                  <div className="text-xs font-bold text-slate-500 md:text-right">
                    <p>{match.stage}</p>
                    {match.group ? <p>{match.group}</p> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm font-bold text-slate-500">
                No matches available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
