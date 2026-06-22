"use client";

import Image from "next/image";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { stageInlineName } from "@/lib/stage-labels";

export type Last32Team = {
  id: string;
  tournament_id: string;
  country_name: string | null;
  country_code: string | null;
  flag_url: string | null;
  flag_asset_path: string | null;
  seed_position: number;
};

function flagPath(team: Last32Team) {
  return team.flag_asset_path || team.flag_url || "";
}

export function Last32PlayerPicker({
  teams,
  initialPickedTeamIds,
}: {
  teams: Last32Team[];
  initialPickedTeamIds: string[];
}) {
  const [picked, setPicked] = useState<string[]>(initialPickedTeamIds);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const tournamentId = teams[0]?.tournament_id;

  function toggle(teamId: string) {
    setMessage("");
    setPicked((current) =>
      current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : [...current, teamId],
    );
  }

  async function save() {
    if (!tournamentId || !picked.length || saving) return;

    setSaving(true);
    setMessage("");

    try {
      if (!isSupabaseConfigured()) {
        setMessage("Picks saved on this device.");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.rpc("save_my_last32_picks", {
        p_tournament_id: tournamentId,
        p_team_ids: picked,
      });

      if (error) throw new Error(error.message);
      setMessage(`Your ${stageInlineName("last_32")} picks are saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save picks.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-lg bg-[#071525] p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white/65">
              {stageInlineName("last_32")}
            </p>
            <p className="text-xl font-black">Picked {picked.length} teams</p>
          </div>
          <button
            type="button"
            disabled={!picked.length || saving}
            onClick={save}
            className="flex h-11 items-center justify-center gap-2 rounded bg-[#d71920] px-4 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? "Saving..." : "Save Picks"}
          </button>
        </div>
        {message ? <p className="mt-3 text-sm font-bold text-[#f4c542]">{message}</p> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {teams.map((team) => {
          const selected = picked.includes(team.id);
          const flag = flagPath(team);

          return (
            <button
              key={team.id}
              type="button"
              onClick={() => toggle(team.id)}
              className={`rounded-lg border p-3 text-left shadow-sm transition ${
                selected
                  ? "border-[#0f8a4b] bg-green-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded bg-slate-100 text-xs font-black text-slate-500">
                  {flag ? (
                    <Image src={flag} alt="" width={64} height={42} className="h-full w-full object-cover" />
                  ) : (
                    team.country_code
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-black text-slate-950">
                    {team.country_name}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">
                    {team.country_code} · Seat {team.seed_position}
                  </span>
                </span>
              </div>
              <span
                className={`mt-3 inline-flex rounded px-3 py-1 text-xs font-black ${
                  selected ? "bg-[#0f8a4b] text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {selected ? "Picked" : "Pick"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
