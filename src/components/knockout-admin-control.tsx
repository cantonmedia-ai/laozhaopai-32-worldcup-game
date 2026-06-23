"use client";

import Image from "next/image";
import { useState } from "react";
import { Calculator, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  knockoutStageOrder,
  stageDescription,
  stageDisplayName,
  stageInlineName,
} from "@/lib/stage-labels";
import type { KnockoutMatch, KnockoutTeam } from "@/components/knockout-db-game";

type RoundRow = {
  round_key: string;
  round_name: string;
  status: string;
};

const roundOptions = knockoutStageOrder.map((key) => [key, stageInlineName(key)] as const);

function flagPath(team: KnockoutTeam) {
  return team.flag_asset_path || team.flag_url || "";
}

function toLocalInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function KnockoutAdminControl({
  rounds,
  matches,
  teams,
}: {
  rounds: RoundRow[];
  matches: KnockoutMatch[];
  teams: KnockoutTeam[];
}) {
  const [roundKey, setRoundKey] = useState("last_32");
  const [matchNumber, setMatchNumber] = useState(1);
  const [teamAId, setTeamAId] = useState(teams[0]?.id ?? "");
  const [teamBId, setTeamBId] = useState(teams[1]?.id ?? "");
  const [matchStartAt, setMatchStartAt] = useState("");
  const [lockAt, setLockAt] = useState("");
  const [status, setStatus] = useState("open");
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id ?? "");
  const [winnerId, setWinnerId] = useState(matches[0]?.team_a.id ?? "");
  const [actualTeamAScore, setActualTeamAScore] = useState("");
  const [actualTeamBScore, setActualTeamBScore] = useState("");
  const [previousRound, setPreviousRound] = useState("last_32");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const selectedMatch = matches.find((match) => match.id === selectedMatchId);

  async function saveMatch() {
    setBusy("save");
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("admin_upsert_knockout_match", {
        p_match_id: null,
        p_round_key: roundKey,
        p_match_number: matchNumber,
        p_team_a_id: teamAId,
        p_team_b_id: teamBId,
        p_match_start_at: new Date(matchStartAt).toISOString(),
        p_prediction_lock_at: new Date(lockAt).toISOString(),
        p_status: status,
      });
      if (error) throw new Error(error.message);
      setMessage("Match saved. Refresh to see latest list.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save match.");
    } finally {
      setBusy("");
    }
  }

  async function confirmWinner() {
    if (!selectedMatchId || !winnerId) return;
    const teamAScore = Number(actualTeamAScore);
    const teamBScore = Number(actualTeamBScore);
    if (
      actualTeamAScore.trim() === "" ||
      actualTeamBScore.trim() === "" ||
      !Number.isInteger(teamAScore) ||
      !Number.isInteger(teamBScore) ||
      teamAScore < 0 ||
      teamBScore < 0
    ) {
      setMessage("Enter official scores for both countries before scoring.");
      return;
    }
    setBusy("confirm");
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("admin_confirm_knockout_match_result", {
        p_match_id: selectedMatchId,
        p_actual_winner_team_id: winnerId,
        p_team_a_score: teamAScore,
        p_team_b_score: teamBScore,
      });
      if (error) throw new Error(error.message);
      setMessage("Winner confirmed. Solo and team scores calculated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to confirm winner.");
    } finally {
      setBusy("");
    }
  }

  async function createNextRound() {
    setBusy("next");
    setMessage("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("admin_create_next_knockout_round", {
        p_previous_round_key: previousRound,
      });
      if (error) throw new Error(error.message);
      setMessage(`Next round is ready for pairing: ${data}. Use winners from previous round to create matches.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create next round.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="grid gap-5">
      {message ? (
        <div className="rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-5">
        {roundOptions.map(([key]) => {
          const row = rounds.find((item) => item.round_key === key);
          const count = matches.filter((match) => match.round_key === key).length;
          return (
            <div key={key} className="rounded bg-white p-4 shadow-sm">
              <p className="font-black text-slate-950">
                {stageDisplayName(key).split("\n").map((line) => (
                  <span key={line} className="block leading-tight">
                    {line}
                  </span>
                ))}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {stageDescription(key)}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {row?.status ?? "not_created"}
              </p>
              <p className="mt-2 text-sm font-bold text-[#d71920]">
                {count ? `${count} matches` : "Not Created"}
              </p>
            </div>
          );
        })}
      </section>

      <section className="card grid gap-4 p-5 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-black text-slate-950">Create matches by round</h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-black text-slate-700">
              Round
              <select value={roundKey} onChange={(event) => setRoundKey(event.target.value)} className="h-11 rounded border border-slate-200 px-3">
                {roundOptions.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-black text-slate-700">
              Match number
              <input type="number" min={1} value={matchNumber} onChange={(event) => setMatchNumber(Number(event.target.value))} className="h-11 rounded border border-slate-200 px-3" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <TeamSelect label="Team A" teams={teams} value={teamAId} onChange={setTeamAId} />
              <TeamSelect label="Team B" teams={teams} value={teamBId} onChange={setTeamBId} />
            </div>
            <label className="grid gap-1 text-sm font-black text-slate-700">
              Match date / time
              <input type="datetime-local" value={matchStartAt} onChange={(event) => setMatchStartAt(event.target.value)} className="h-11 rounded border border-slate-200 px-3" />
            </label>
            <label className="grid gap-1 text-sm font-black text-slate-700">
              Prediction due date / lock time
              <input type="datetime-local" value={lockAt} onChange={(event) => setLockAt(event.target.value)} className="h-11 rounded border border-slate-200 px-3" />
            </label>
            <label className="grid gap-1 text-sm font-black text-slate-700">
              Match status
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded border border-slate-200 px-3">
                <option value="draft">draft</option>
                <option value="open">open</option>
                <option value="locked">locked</option>
                <option value="scored">scored</option>
                <option value="completed">completed</option>
              </select>
            </label>
            <button type="button" onClick={saveMatch} disabled={busy === "save"} className="flex h-11 items-center justify-center gap-2 rounded bg-[#d71920] font-black text-white disabled:bg-slate-400">
              {busy === "save" ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Match
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-950">Enter match result</h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-black text-slate-700">
              Select match
              <select
                value={selectedMatchId}
                onChange={(event) => {
                  const match = matches.find((item) => item.id === event.target.value);
                  setSelectedMatchId(event.target.value);
                  setWinnerId(match?.team_a.id ?? "");
                  setActualTeamAScore(
                    typeof match?.team_a_score === "number" ? String(match.team_a_score) : "",
                  );
                  setActualTeamBScore(
                    typeof match?.team_b_score === "number" ? String(match.team_b_score) : "",
                  );
                }}
                className="h-11 rounded border border-slate-200 px-3"
              >
                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {stageInlineName(match.round_key)} #{match.match_number}:{" "}
                    {match.team_a.country_code} vs {match.team_b.country_code}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-black text-slate-700">
                {selectedMatch?.team_a.country_name ?? "Team A"} score
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={actualTeamAScore}
                  onChange={(event) => setActualTeamAScore(event.target.value)}
                  className="h-11 rounded border border-slate-200 px-3"
                />
              </label>
              <label className="grid gap-1 text-sm font-black text-slate-700">
                {selectedMatch?.team_b.country_name ?? "Team B"} score
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={actualTeamBScore}
                  onChange={(event) => setActualTeamBScore(event.target.value)}
                  className="h-11 rounded border border-slate-200 px-3"
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-black text-slate-700">
              Actual winner
              <select value={winnerId} onChange={(event) => setWinnerId(event.target.value)} className="h-11 rounded border border-slate-200 px-3">
                {selectedMatch ? (
                  <>
                    <option value={selectedMatch.team_a.id}>{selectedMatch.team_a.country_name}</option>
                    <option value={selectedMatch.team_b.id}>{selectedMatch.team_b.country_name}</option>
                  </>
                ) : null}
              </select>
            </label>
            <button type="button" onClick={confirmWinner} disabled={busy === "confirm"} className="flex h-11 items-center justify-center gap-2 rounded bg-[#071525] font-black text-white disabled:bg-slate-400">
              {busy === "confirm" ? <Loader2 className="animate-spin" size={18} /> : <Calculator size={18} />}
              Confirm Winner and Score
            </button>
          </div>

          <div className="mt-6 rounded bg-slate-100 p-4">
            <h3 className="font-black text-slate-950">Create next round from winners</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              After the previous round is completed, this unlocks the next round for pairing.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <select value={previousRound} onChange={(event) => setPreviousRound(event.target.value)} className="h-11 rounded border border-slate-200 px-3">
                <option value="last_32">
                  After {stageInlineName("last_32")}, create {stageInlineName("last_16")}
                </option>
                <option value="last_16">
                  After {stageInlineName("last_16")}, create {stageInlineName("last_8")}
                </option>
                <option value="last_8">
                  After {stageInlineName("last_8")}, create {stageInlineName("last_4")}
                </option>
                <option value="last_4">
                  After {stageInlineName("last_4")}, create {stageInlineName("final")}
                </option>
              </select>
              <button type="button" onClick={createNextRound} disabled={busy === "next"} className="h-11 rounded bg-[#f4c542] px-4 font-black text-[#071525] disabled:bg-slate-300">
                Create Next Round
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="p-4">Round</th>
              <th className="p-4">Match</th>
              <th className="p-4">Team A</th>
              <th className="p-4">Team B</th>
              <th className="p-4">Start</th>
              <th className="p-4">Due</th>
              <th className="p-4">Status</th>
              <th className="p-4">Score</th>
              <th className="p-4">Winner</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.id} className="border-t border-slate-100">
                <td className="p-4 font-black">{stageInlineName(match.round_key)}</td>
                <td className="p-4">{match.match_number}</td>
                <td className="p-4">{match.team_a.country_name}</td>
                <td className="p-4">{match.team_b.country_name}</td>
                <td className="p-4">{toLocalInput(match.match_start_at)}</td>
                <td className="p-4">{toLocalInput(match.prediction_lock_at)}</td>
                <td className="p-4 font-black text-[#0f8a4b]">{match.status}</td>
                <td className="p-4">
                  {typeof match.team_a_score === "number" && typeof match.team_b_score === "number"
                    ? `${match.team_a_score} - ${match.team_b_score}`
                    : "-"}
                </td>
                <td className="p-4">{match.actual_winner_team_id ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function TeamSelect({
  label,
  teams,
  value,
  onChange,
}: {
  label: string;
  teams: KnockoutTeam[];
  value: string;
  onChange: (value: string) => void;
}) {
  const team = teams.find((item) => item.id === value);
  const flag = team ? flagPath(team) : "";
  return (
    <label className="grid gap-1 text-sm font-black text-slate-700">
      {label}
      <div className="grid grid-cols-[48px_1fr] items-center gap-2">
        <span className="grid size-11 place-items-center overflow-hidden rounded bg-slate-100 text-xs">
          {flag ? <Image src={flag} alt="" width={44} height={30} className="h-full w-full object-cover" /> : "?"}
        </span>
        <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded border border-slate-200 px-3">
          {teams.map((item) => (
            <option key={item.id} value={item.id}>
              {item.country_name} ({item.country_code})
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
