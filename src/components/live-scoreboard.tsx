"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  History,
  RefreshCw,
  RadioTower,
  Table2,
} from "lucide-react";

type ScoreboardMatch = {
  id: string;
  utcDate: string;
  status: string;
  minute: number | null;
  stage: string;
  group: string;
  homeTeam: ScoreboardTeam;
  awayTeam: ScoreboardTeam;
  score: {
    home: number | null;
    away: number | null;
    halfHome: number | null;
    halfAway: number | null;
  };
};

type ScoreboardTeam = {
  name: string;
  shortName: string;
  crest?: string;
};

type Standing = {
  group: string;
  stage: string;
  rows: StandingRow[];
};

type StandingRow = {
  position: number;
  team: ScoreboardTeam;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalDifference: number;
  points: number;
};

type ScoreboardResponse = {
  source: "live" | "fallback";
  provider: string;
  updatedAt: string;
  message?: string;
  matches: ScoreboardMatch[];
  liveMatches: ScoreboardMatch[];
  nextMatches: ScoreboardMatch[];
  pastResults: ScoreboardMatch[];
  standings: Standing[];
};

const initialState: ScoreboardResponse = {
  source: "fallback",
  provider: "Football-Data.org",
  updatedAt: new Date().toISOString(),
  matches: [],
  liveMatches: [],
  nextMatches: [],
  pastResults: [],
  standings: [],
};

function statusText(match: ScoreboardMatch) {
  if (match.status === "IN_PLAY" || match.status === "LIVE") {
    return match.minute ? `${match.minute}' Live` : "Live";
  }

  if (match.status === "PAUSED") return "Half-time";
  if (match.status === "FINISHED" || match.status === "AWARDED") return "Full-time";
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

function TeamName({ team, align = "left" }: { team: ScoreboardTeam; align?: "left" | "right" }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === "right" ? "md:justify-end" : ""
      }`}
    >
      {align === "left" && team.crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.crest} alt="" className="size-7 shrink-0 object-contain" />
      ) : null}
      <span className="truncate font-black">{team.name}</span>
      {align === "right" && team.crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.crest} alt="" className="size-7 shrink-0 object-contain" />
      ) : null}
    </div>
  );
}

function MatchRows({
  emptyText,
  matches,
}: {
  emptyText: string;
  matches: ScoreboardMatch[];
}) {
  if (!matches.length) {
    return (
      <div className="px-4 py-8 text-center text-sm font-bold text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {matches.map((match) => (
        <div
          key={match.id}
          className="grid gap-3 px-4 py-4 md:grid-cols-[120px_1fr_92px_1fr_120px] md:items-center"
        >
          <div className="text-xs font-black text-slate-500">
            <p>{statusText(match)}</p>
            <p className="mt-1 font-bold text-slate-400">{matchDate(match.utcDate)}</p>
          </div>

          <TeamName team={match.homeTeam} />

          <div className="grid grid-cols-[1fr_auto_1fr] items-center rounded bg-slate-100 px-3 py-2 text-center text-2xl font-black">
            <span>{scoreLabel(match.score.home)}</span>
            <span className="px-2 text-sm text-slate-400">:</span>
            <span>{scoreLabel(match.score.away)}</span>
          </div>

          <TeamName team={match.awayTeam} align="right" />

          <div className="text-xs font-bold text-slate-500 md:text-right">
            <p>{match.stage}</p>
            {match.group ? <p>{match.group}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScorePanel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white text-slate-950 shadow-2xl">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-black text-slate-700">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function StandingsTable({ standings }: { standings: Standing[] }) {
  if (!standings.length) {
    return (
      <div className="rounded-lg bg-white px-4 py-8 text-center text-sm font-bold text-slate-500">
        No group standings available yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {standings.slice(0, 8).map((standing) => (
        <div
          key={`${standing.stage}-${standing.group}`}
          className="overflow-hidden rounded-lg bg-white text-slate-950 shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-black text-[#0f8a4b]">{standing.group}</p>
              <p className="text-xs font-bold text-slate-500">{standing.stage}</p>
            </div>
            <Table2 size={18} className="text-[#d71920]" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Team</th>
                  <th className="px-2 py-2 text-center">P</th>
                  <th className="px-2 py-2 text-center">W</th>
                  <th className="px-2 py-2 text-center">D</th>
                  <th className="px-2 py-2 text-center">L</th>
                  <th className="px-2 py-2 text-center">GD</th>
                  <th className="px-3 py-2 text-center">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {standing.rows.map((row) => (
                  <tr key={`${standing.group}-${row.position}-${row.team.shortName}`}>
                    <td className="px-3 py-2 font-black text-slate-500">
                      {row.position}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2 font-black">
                      {row.team.name}
                    </td>
                    <td className="px-2 py-2 text-center font-bold">{row.played}</td>
                    <td className="px-2 py-2 text-center font-bold">{row.won}</td>
                    <td className="px-2 py-2 text-center font-bold">{row.draw}</td>
                    <td className="px-2 py-2 text-center font-bold">{row.lost}</td>
                    <td className="px-2 py-2 text-center font-bold">
                      {row.goalDifference}
                    </td>
                    <td className="px-3 py-2 text-center font-black text-[#d71920]">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
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

  const liveCount = useMemo(() => data.liveMatches.length, [data.liveMatches.length]);

  return (
    <section className="bg-[#071525] px-4 py-6 text-white md:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 rounded bg-white/10 px-3 py-1 text-xs font-black text-[#f4c542]">
              <RadioTower size={14} /> Live Match Center
            </p>
            <h2 className="mt-3 text-2xl font-black md:text-4xl">
              Scores, next games and group standings
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

        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded bg-white/10 p-3">
            <p className="text-xs font-bold text-white/60">Live</p>
            <p className="mt-1 text-2xl font-black">{liveCount}</p>
          </div>
          <div className="rounded bg-white/10 p-3">
            <p className="text-xs font-bold text-white/60">Next games</p>
            <p className="mt-1 text-2xl font-black">{data.nextMatches.length}</p>
          </div>
          <div className="rounded bg-white/10 p-3">
            <p className="text-xs font-bold text-white/60">Groups</p>
            <p className="mt-1 text-2xl font-black">{data.standings.length}</p>
          </div>
        </div>

        <div className="grid gap-5">
          <ScorePanel
            icon={<Activity size={16} className="text-[#d71920]" />}
            title={liveCount ? `${liveCount} live now` : "Live / today"}
          >
            <MatchRows emptyText="No live matches right now." matches={data.liveMatches} />
          </ScorePanel>

          <ScorePanel
            icon={<CalendarDays size={16} className="text-[#0f8a4b]" />}
            title="Next games"
          >
            <MatchRows emptyText="No upcoming games available yet." matches={data.nextMatches} />
          </ScorePanel>

          <ScorePanel
            icon={<History size={16} className="text-[#f4c542]" />}
            title="Past results"
          >
            <MatchRows emptyText="No completed results available yet." matches={data.pastResults} />
          </ScorePanel>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-xl font-black">Group standings</h3>
              <p className="text-xs font-bold text-white/60">
                Updated {matchDate(data.updatedAt)}
              </p>
            </div>
            <StandingsTable standings={data.standings} />
          </div>
        </div>
      </div>
    </section>
  );
}
