"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type AdminTeamOption = {
  id: string;
  country_name: string | null;
  country_code: string | null;
  flag_url: string | null;
  flag_asset_path: string | null;
  group_name: string | null;
  is_active: boolean | null;
};

function teamName(team: AdminTeamOption) {
  return team.country_name || team.country_code || "Unnamed team";
}

function flagPath(team: AdminTeamOption) {
  return team.flag_asset_path || team.flag_url || "";
}

export function Last32AdminSelector({
  teams,
  selectedTeamIds,
}: {
  teams: AdminTeamOption[];
  selectedTeamIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(selectedTeamIds);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const filteredTeams = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return teams.filter((team) => {
      if (!team.is_active) return false;
      if (!cleanQuery) return true;
      return `${team.country_name ?? ""} ${team.country_code ?? ""} ${team.group_name ?? ""}`
        .toLowerCase()
        .includes(cleanQuery);
    });
  }, [query, teams]);

  function toggleTeam(teamId: string) {
    setMessage("");
    setSelected((current) => {
      if (current.includes(teamId)) {
        return current.filter((id) => id !== teamId);
      }

      if (current.length >= 32) {
        setMessage("You already selected 32 teams. Unselect one before adding another.");
        return current;
      }

      return [...current, teamId];
    });
  }

  async function save() {
    if (selected.length !== 32 || saving) return;

    setSaving(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("save_last32_teams", {
        p_tournament_name: "FIFA World Cup 2026",
        p_team_ids: selected,
      });

      if (error) throw new Error(error.message);
      setMessage("Last 32 Seats saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save Last 32.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="card grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-sm font-black text-[#0f8a4b]">Manage Last 32 Seats</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Selected {selected.length} / 32
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Select exactly 32 active teams from the database.
          </p>
        </div>
        <button
          type="button"
          disabled={selected.length !== 32 || saving}
          onClick={save}
          className="flex h-12 items-center justify-center gap-2 rounded bg-[#d71920] px-5 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? "Saving..." : "Save Last 32"}
        </button>
      </div>

      {message ? (
        <div className="rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
          {message}
        </div>
      ) : null}

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-12 rounded border border-slate-200 px-4 font-semibold outline-none focus:border-[#d71920]"
        placeholder="Search country, code, or group"
      />

      <div className="card overflow-hidden">
        {filteredTeams.map((team) => {
          const checked = selected.includes(team.id);
          const flag = flagPath(team);

          return (
            <button
              key={team.id}
              type="button"
              onClick={() => toggleTeam(team.id)}
              className="grid w-full grid-cols-[52px_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
            >
              <span className="grid size-11 place-items-center overflow-hidden rounded bg-slate-100 text-xs font-black text-slate-500">
                {flag ? (
                  <Image
                    src={flag}
                    alt=""
                    width={44}
                    height={30}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  team.country_code ?? "?"
                )}
              </span>
              <span>
                <span className="block font-black text-slate-950">
                  {teamName(team)}
                </span>
                <span className="text-sm font-semibold text-slate-500">
                  {team.country_code} {team.group_name ? `· Group ${team.group_name}` : ""}
                </span>
              </span>
              <span
                className={`rounded px-3 py-1 text-xs font-black ${
                  checked
                    ? "bg-[#0f8a4b] text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {checked ? "Selected" : "Select"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
