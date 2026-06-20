"use client";

import { useMemo, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getTeam, matches, rewards } from "@/lib/demo-data";

type Status = {
  tone: "green" | "red" | "yellow";
  text: string;
};

function StatusMessage({ status }: { status?: Status }) {
  if (!status) return null;

  const tones = {
    green: "bg-green-50 text-green-800",
    red: "bg-red-50 text-red-700",
    yellow: "bg-yellow-50 text-yellow-900",
  };

  return (
    <div className={`rounded p-3 text-sm font-bold ${tones[status.tone]}`}>
      {status.text}
    </div>
  );
}

export function AdminCampaignForm({
  game,
}: {
  game: { id: string; name: string; slug: string; status: string };
}) {
  const [name, setName] = useState(game.name);
  const [slug, setSlug] = useState(game.slug);
  const [status, setStatus] = useState(game.status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Status>();

  async function save() {
    setSaving(true);
    setMessage(undefined);

    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { error } = await supabase
          .from("games")
          .update({ name, slug, status, updated_at: new Date().toISOString() })
          .eq("id", game.id);

        if (error) throw new Error(error.message);
        setMessage({ tone: "green", text: "Campaign saved to Supabase." });
      } else {
        setMessage({
          tone: "yellow",
          text: "Demo saved. Add Supabase env vars to save this permanently.",
        });
      }
    } catch (error) {
      setMessage({
        tone: "red",
        text: error instanceof Error ? error.message : "Unable to save campaign.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card max-w-3xl p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 font-bold">
          Name
          <input className="h-12 rounded border border-slate-200 px-3" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="grid gap-2 font-bold">
          Slug
          <input className="h-12 rounded border border-slate-200 px-3" value={slug} onChange={(event) => setSlug(event.target.value)} />
        </label>
        <label className="grid gap-2 font-bold">
          Status
          <select className="h-12 rounded border border-slate-200 px-3" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>draft</option>
            <option>active</option>
            <option>completed</option>
            <option>archived</option>
          </select>
        </label>
      </div>
      <div className="mt-5 grid gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="h-12 rounded bg-[#071525] font-black text-white disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save campaign"}
        </button>
        <StatusMessage status={message} />
      </div>
    </div>
  );
}

export function AdminResultForm() {
  const [matchId, setMatchId] = useState(matches[0].id);
  const selected = useMemo(
    () => matches.find((match) => match.id === matchId) ?? matches[0],
    [matchId],
  );
  const [teamAScore, setTeamAScore] = useState(2);
  const [teamBScore, setTeamBScore] = useState(0);
  const [winnerTeamId, setWinnerTeamId] = useState(selected.teamAId);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Status>();

  function changeMatch(nextMatchId: string) {
    const next = matches.find((match) => match.id === nextMatchId) ?? matches[0];
    setMatchId(nextMatchId);
    setWinnerTeamId(next.teamAId);
    setTeamAScore(0);
    setTeamBScore(0);
  }

  async function confirm() {
    setSaving(true);
    setMessage(undefined);

    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { error } = await supabase.rpc("confirm_match_result", {
          p_match_id: matchId,
          p_team_a_score: teamAScore,
          p_team_b_score: teamBScore,
          p_winner_team_id: winnerTeamId,
          p_reason: note || "Admin confirmed result",
        });

        if (error) throw new Error(error.message);
        setMessage({
          tone: "green",
          text: "Result confirmed. Scores and leaderboards were rebuilt.",
        });
      } else {
        setMessage({
          tone: "yellow",
          text: "Demo confirmed. With Supabase connected, this will lock predictions, award score, rebuild leaderboard, and write audit log.",
        });
      }
    } catch (error) {
      setMessage({
        tone: "red",
        text: error instanceof Error ? error.message : "Unable to confirm result.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card grid max-w-2xl gap-4 p-5">
      <label className="grid gap-2 font-bold">
        Select match
        <select className="h-12 rounded border border-slate-200 px-3" value={matchId} onChange={(event) => changeMatch(event.target.value)}>
          {matches.map((match) => (
            <option key={match.id} value={match.id}>
              Match {match.matchNo}: {getTeam(match.teamAId).shortName} vs {getTeam(match.teamBId).shortName}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 font-bold">
          {getTeam(selected.teamAId).name} score
          <input type="number" min={0} className="h-12 rounded border border-slate-200 px-3" value={teamAScore} onChange={(event) => setTeamAScore(Number(event.target.value))} />
        </label>
        <label className="grid gap-2 font-bold">
          {getTeam(selected.teamBId).name} score
          <input type="number" min={0} className="h-12 rounded border border-slate-200 px-3" value={teamBScore} onChange={(event) => setTeamBScore(Number(event.target.value))} />
        </label>
      </div>
      <label className="grid gap-2 font-bold">
        Winner team
        <select className="h-12 rounded border border-slate-200 px-3" value={winnerTeamId} onChange={(event) => setWinnerTeamId(event.target.value)}>
          <option value={selected.teamAId}>{getTeam(selected.teamAId).name}</option>
          <option value={selected.teamBId}>{getTeam(selected.teamBId).name}</option>
        </select>
      </label>
      <label className="grid gap-2 font-bold">
        Reason / note
        <textarea className="min-h-24 rounded border border-slate-200 p-3" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional audit note" />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={confirm}
        className="h-12 rounded bg-[#d71920] font-black text-white disabled:cursor-wait disabled:opacity-60"
      >
        {saving ? "Confirming..." : "Confirm result"}
      </button>
      <StatusMessage status={message} />
    </form>
  );
}

export function AdminRewardCards() {
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<Status>();

  async function markClaimed(rewardId: string) {
    setMessage(undefined);

    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { error } = await supabase
          .from("rewards")
          .update({
            claim_status: "claimed",
            claimed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", rewardId);

        if (error) throw new Error(error.message);
      }

      setClaimed((current) => ({ ...current, [rewardId]: true }));
      setMessage({
        tone: isSupabaseConfigured() ? "green" : "yellow",
        text: isSupabaseConfigured()
          ? "Reward marked claimed in Supabase."
          : "Demo claimed. Add Supabase env vars to save permanently.",
      });
    } catch (error) {
      setMessage({
        tone: "red",
        text: error instanceof Error ? error.message : "Unable to update reward.",
      });
    }
  }

  return (
    <div className="grid gap-4">
      <StatusMessage status={message} />
      <div className="grid gap-4 md:grid-cols-2">
        {rewards.map((reward) => {
          const isClaimed = claimed[reward.id] || reward.claimStatus === "claimed";
          return (
            <div key={reward.id} className="card p-5">
              <p className="font-black">{reward.rewardName}</p>
              <p className="mt-1 text-sm text-slate-500">{reward.rankType}</p>
              <button
                type="button"
                disabled={isClaimed}
                onClick={() => markClaimed(reward.id)}
                className="mt-4 rounded bg-[#071525] px-4 py-2 text-sm font-black text-white disabled:bg-slate-300 disabled:text-slate-600"
              >
                {isClaimed ? "Claimed" : "Mark claimed"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
