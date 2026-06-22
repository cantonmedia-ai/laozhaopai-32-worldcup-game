"use client";

import Image from "next/image";
import { useState } from "react";
import clsx from "clsx";
import { Calculator, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  formatMalaysiaDate,
  malaysiaInputToIso,
  roadStageCopy,
  toMalaysiaDateTimeInput,
  type RoadStageKey,
} from "@/lib/road-to-champion";
import type { RoadStage, RoadTeam } from "@/components/road-to-champion-game";

type StageResult = {
  stage_key: RoadStageKey;
  official_team_ids: string[];
};

function flagPath(team: RoadTeam) {
  return team.flag_asset_path || team.flag_url || "";
}

export function RoadToChampionAdmin({
  stages,
  teams,
  results,
}: {
  stages: RoadStage[];
  teams: RoadTeam[];
  results: StageResult[];
}) {
  const [draftStages, setDraftStages] = useState(
    Object.fromEntries(
      stages.map((stage) => [
        stage.stage_key,
        {
          dueAt: toMalaysiaDateTimeInput(stage.due_at),
          status: stage.status,
          pointsPerCorrect: stage.points_per_correct,
          perfectBonus: stage.perfect_bonus_points,
        },
      ]),
    ) as Record<
      RoadStageKey,
      {
        dueAt: string;
        status: RoadStage["status"];
        pointsPerCorrect: number;
        perfectBonus: number;
      }
    >,
  );
  const [officialByStage, setOfficialByStage] = useState(
    Object.fromEntries(
      stages.map((stage) => [
        stage.stage_key,
        results.find((result) => result.stage_key === stage.stage_key)
          ?.official_team_ids ?? [],
      ]),
    ) as Record<RoadStageKey, string[]>,
  );
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  function updateStage(stageKey: RoadStageKey, field: string, value: string | number) {
    setDraftStages((current) => ({
      ...current,
      [stageKey]: {
        ...current[stageKey],
        [field]: value,
      },
    }));
  }

  function toggleOfficial(stage: RoadStage, teamId: string) {
    setMessage("");
    setOfficialByStage((current) => {
      const selected = current[stage.stage_key] ?? [];
      if (selected.includes(teamId)) {
        return {
          ...current,
          [stage.stage_key]: selected.filter((id) => id !== teamId),
        };
      }
      if (selected.length >= stage.required_selection_count) return current;
      return {
        ...current,
        [stage.stage_key]: [...selected, teamId],
      };
    });
  }

  async function saveStage(stage: RoadStage) {
    const draft = draftStages[stage.stage_key];
    setBusy(`${stage.stage_key}:stage`);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("admin_update_prediction_stage", {
        p_stage_key: stage.stage_key,
        p_due_at: malaysiaInputToIso(draft.dueAt),
        p_status: draft.status,
        p_points_per_correct: Number(draft.pointsPerCorrect),
        p_perfect_bonus_points: Number(draft.perfectBonus),
      });

      if (error) throw new Error(error.message);
      setMessage(`${stage.stage_name} settings saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save stage.");
    } finally {
      setBusy("");
    }
  }

  async function saveResult(stage: RoadStage) {
    const official = officialByStage[stage.stage_key] ?? [];
    setBusy(`${stage.stage_key}:result`);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("admin_save_stage_result", {
        p_stage_key: stage.stage_key,
        p_team_ids: official,
      });

      if (error) throw new Error(error.message);
      setMessage(`${stage.stage_name} official result saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save result.");
    } finally {
      setBusy("");
    }
  }

  async function calculate(stage: RoadStage) {
    setBusy(`${stage.stage_key}:score`);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("admin_calculate_road_stage_score", {
        p_stage_key: stage.stage_key,
      });

      if (error) throw new Error(error.message);
      setMessage(`${stage.stage_name} scores calculated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to calculate score.");
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

      {stages.map((stage) => {
        const draft = draftStages[stage.stage_key];
        const official = officialByStage[stage.stage_key] ?? [];
        const resultComplete = official.length === stage.required_selection_count;

        return (
          <section key={stage.stage_key} className="card overflow-hidden">
            <div className="grid gap-4 border-b border-slate-100 p-5 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0f8a4b]">
                  {roadStageCopy[stage.stage_key].title}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  {stage.stage_name}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Current due date: {formatMalaysiaDate(stage.due_at)}
                </p>
              </div>
              <div className="rounded bg-slate-100 p-4 text-sm font-bold text-slate-700">
                Required selections: {stage.required_selection_count}
              </div>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-5">
              <label className="grid gap-2 text-sm font-black text-slate-700 lg:col-span-2">
                Due date / lock time
                <input
                  type="datetime-local"
                  value={draft.dueAt}
                  onChange={(event) =>
                    updateStage(stage.stage_key, "dueAt", event.target.value)
                  }
                  className="h-12 rounded border border-slate-200 px-3 font-semibold"
                />
                <span className="text-xs font-bold text-slate-500">
                  Malaysia timezone: Asia/Kuala_Lumpur
                </span>
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Status
                <select
                  value={draft.status}
                  onChange={(event) =>
                    updateStage(stage.stage_key, "status", event.target.value)
                  }
                  className="h-12 rounded border border-slate-200 px-3 font-semibold"
                >
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="locked">Locked</option>
                  <option value="scored">Scored</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Correct points
                <input
                  type="number"
                  min={0}
                  value={draft.pointsPerCorrect}
                  onChange={(event) =>
                    updateStage(stage.stage_key, "pointsPerCorrect", Number(event.target.value))
                  }
                  className="h-12 rounded border border-slate-200 px-3 font-semibold"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Perfect bonus
                <input
                  type="number"
                  min={0}
                  value={draft.perfectBonus}
                  onChange={(event) =>
                    updateStage(stage.stage_key, "perfectBonus", Number(event.target.value))
                  }
                  className="h-12 rounded border border-slate-200 px-3 font-semibold"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2 px-5 pb-5">
              <button
                type="button"
                onClick={() => updateStage(stage.stage_key, "status", "open")}
                className="rounded bg-green-100 px-4 py-2 text-sm font-black text-green-800"
              >
                Open Stage
              </button>
              <button
                type="button"
                onClick={() => updateStage(stage.stage_key, "status", "locked")}
                className="rounded bg-slate-200 px-4 py-2 text-sm font-black text-slate-800"
              >
                Lock Stage
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => saveStage(stage)}
                className="flex items-center gap-2 rounded bg-[#d71920] px-4 py-2 text-sm font-black text-white disabled:bg-slate-400"
              >
                {busy === `${stage.stage_key}:stage` ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                Save Due Date / Status
              </button>
            </div>

            <div className="border-t border-slate-100 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    Enter official result
                  </h3>
                  <p className="text-sm font-semibold text-slate-600">
                    Selected {official.length} / {stage.required_selection_count}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!resultComplete || Boolean(busy)}
                    onClick={() => saveResult(stage)}
                    className="flex h-11 items-center gap-2 rounded bg-[#071525] px-4 font-black text-white disabled:bg-slate-400"
                  >
                    {busy === `${stage.stage_key}:result` ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                    Save Result
                  </button>
                  <button
                    type="button"
                    disabled={!resultComplete || Boolean(busy)}
                    onClick={() => calculate(stage)}
                    className="flex h-11 items-center gap-2 rounded bg-[#f4c542] px-4 font-black text-[#071525] disabled:bg-slate-300"
                  >
                    {busy === `${stage.stage_key}:score` ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Calculator size={16} />
                    )}
                    Calculate Score
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {teams.map((team) => {
                  const selected = official.includes(team.id);
                  const flag = flagPath(team);

                  return (
                    <button
                      key={`${stage.stage_key}-official-${team.id}`}
                      type="button"
                      onClick={() => toggleOfficial(stage, team.id)}
                      className={clsx(
                        "rounded-lg border p-3 text-left shadow-sm",
                        selected
                          ? "border-[#0f8a4b] bg-green-50"
                          : "border-slate-200 bg-white hover:border-slate-300",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded bg-slate-100 text-xs font-black text-slate-500">
                          {flag ? (
                            <Image
                              src={flag}
                              alt=""
                              width={64}
                              height={42}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            team.country_code
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-black text-slate-950">
                            {team.country_name}
                          </span>
                          <span className="text-sm font-semibold text-slate-500">
                            {team.country_code}
                          </span>
                        </span>
                      </div>
                      <span
                        className={clsx(
                          "mt-3 inline-flex rounded px-3 py-1 text-xs font-black",
                          selected
                            ? "bg-[#0f8a4b] text-white"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {selected ? "Official" : "Select"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600">
              Warning: if this stage is already scored, score calculation will be blocked to prevent duplicate points.
            </div>
          </section>
        );
      })}

      <div className="rounded bg-white p-5 text-sm font-semibold text-slate-600 shadow-sm">
        Admin flow: set due date, open stage, wait for player submissions, lock stage,
        enter official result, then calculate score.
      </div>
    </div>
  );
}
