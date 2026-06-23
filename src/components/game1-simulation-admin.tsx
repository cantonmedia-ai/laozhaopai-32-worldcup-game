"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Loader2, Trash2 } from "lucide-react";

type PlayerScore = {
  nickname: string;
  team_name: string;
  last_16_correct_count: number;
  last_16_points: number;
  last_8_correct_count: number;
  last_8_points: number;
  last_4_correct_count: number;
  last_4_points: number;
  finalists_correct_count: number;
  finalists_points: number;
  champion_correct_count: number;
  champion_points: number;
  game1_individual_score: number;
  game1_team_accumulated_score: number;
  game1_final_earned_score: number;
};

type TeamSummary = {
  team_name: string;
  member_count: number;
  members: string[];
  game1_team_accumulated_score: number;
};

type SimulationResult = {
  ok: boolean;
  message?: string;
  message_en?: string;
  validation?: Record<string, number>;
  player_scores?: PlayerScore[];
  team_summary?: TeamSummary[];
  raw?: unknown;
};

function value(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value ?? "-");
}

export function Game1SimulationAdmin() {
  const [busy, setBusy] = useState<"run" | "clear" | "">("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<SimulationResult | null>(null);

  async function loadCurrentSimulation() {
    try {
      const response = await fetch("/api/admin/game1-simulation/current", {
        cache: "no-store",
      });
      const data = (await response.json()) as SimulationResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to load simulation.");
      if (data.player_scores?.length) {
        setResult(data);
        setMessage(data.message ?? "");
      }
    } catch {
      // Empty state is fine before the first simulation run.
    }
  }

  useEffect(() => {
    loadCurrentSimulation();
  }, []);

  async function runSimulation() {
    setBusy("run");
    setMessage("");

    try {
      const response = await fetch("/api/admin/game1-simulation/run", {
        method: "POST",
      });
      const data = (await response.json()) as SimulationResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to run simulation.");

      await loadCurrentSimulation();
      setMessage(
        data.message ??
          "游戏一模拟测试完成。分数已由真实游戏一计分逻辑自动生成。",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to run simulation.");
    } finally {
      setBusy("");
    }
  }

  async function clearSimulation() {
    setBusy("clear");
    setMessage("");

    try {
      const response = await fetch("/api/admin/game1-simulation/clear", {
        method: "POST",
      });
      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to clear simulation.");

      setResult(null);
      setMessage(
        (data as { message?: string } | null)?.message ??
          "Game 1 simulation data cleared.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to clear simulation.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-slate-100 p-5">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0f8a4b]">
          Dev Test Mode
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Game 1 Simulation Test
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600">
          Creates marked simulation players, teams, picks, and official results, then runs
          the real Game 1 scoring logic. Simulation data is isolated with{" "}
          <span className="font-black">is_simulation = true</span>.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 p-5">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={runSimulation}
          className="flex h-12 items-center gap-2 rounded bg-[#d71920] px-5 font-black text-white disabled:bg-slate-400"
        >
          {busy === "run" ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <FlaskConical size={18} />
          )}
          Run Game 1 Simulation
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={clearSimulation}
          className="flex h-12 items-center gap-2 rounded bg-slate-200 px-5 font-black text-slate-900 disabled:bg-slate-300"
        >
          {busy === "clear" ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Trash2 size={18} />
          )}
          Clear Game 1 Simulation Data
        </button>
      </div>

      {message ? (
        <div className="mx-5 mb-5 rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
          {message}
        </div>
      ) : null}

      {result?.validation ? (
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(result.validation).map(([key, item]) => (
            <div key={key} className="rounded bg-slate-100 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {key.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">{item}</p>
            </div>
          ))}
        </div>
      ) : null}

      {result?.player_scores?.length ? (
        <div className="border-t border-slate-100 p-5">
          <h3 className="text-xl font-black text-slate-950">计算结果</h3>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-[1500px] text-left text-sm">
                <thead className="bg-[#071525] text-white">
                  <tr>
                    {[
                      "玩家名称",
                      "所属团队",
                      "十六强猜中数量",
                      "十六强分数",
                      "八强猜中数量",
                      "八强分数",
                      "四强猜中数量",
                      "四强分数",
                      "决赛猜中数量",
                      "决赛分数",
                      "冠军是否猜中",
                      "冠军分数",
                      "游戏一个人分",
                      "游戏一团队累计分",
                      "游戏一最终获得分",
                    ].map((header) => (
                      <th key={header} className="px-3 py-3 font-black">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.player_scores.map((row) => (
                    <tr key={row.nickname} className="border-t border-slate-200">
                      <td className="px-3 py-3 font-black">{row.nickname}</td>
                      <td className="px-3 py-3 font-bold">{row.team_name}</td>
                      <td className="px-3 py-3">{value(row.last_16_correct_count)}</td>
                      <td className="px-3 py-3">{value(row.last_16_points)}</td>
                      <td className="px-3 py-3">{value(row.last_8_correct_count)}</td>
                      <td className="px-3 py-3">{value(row.last_8_points)}</td>
                      <td className="px-3 py-3">{value(row.last_4_correct_count)}</td>
                      <td className="px-3 py-3">{value(row.last_4_points)}</td>
                      <td className="px-3 py-3">{value(row.finalists_correct_count)}</td>
                      <td className="px-3 py-3">{value(row.finalists_points)}</td>
                      <td className="px-3 py-3">{row.champion_correct_count > 0 ? "是" : "否"}</td>
                      <td className="px-3 py-3">{value(row.champion_points)}</td>
                      <td className="px-3 py-3 font-black">{value(row.game1_individual_score)}</td>
                      <td className="px-3 py-3 font-black">{value(row.game1_team_accumulated_score)}</td>
                      <td className="px-3 py-3 font-black text-[#d71920]">
                        {value(row.game1_final_earned_score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {result?.team_summary?.length ? (
        <div className="border-t border-slate-100 p-5">
          <h3 className="text-xl font-black text-slate-950">团队汇总</h3>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {result.team_summary.map((team) => (
              <div key={team.team_name} className="rounded-lg bg-slate-100 p-4">
                <p className="text-lg font-black text-slate-950">{team.team_name}</p>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  成员人数：{team.member_count}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  成员名单：{team.members.join("、")}
                </p>
                <p className="mt-3 text-2xl font-black text-[#d71920]">
                  {team.game1_team_accumulated_score} 分
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result?.raw ? (
        <div className="grid gap-3 border-t border-slate-100 p-5">
          {[
            ["官方模拟赛果", (result.raw as Record<string, unknown>).official_result],
            ["每位玩家的预测", (result.raw as Record<string, unknown>).player_predictions],
            ["团队成员列表", (result.raw as Record<string, unknown>).team_members],
            ["系统计算结果 JSON", (result.raw as Record<string, unknown>).calculated_json],
          ].map(([title, data]) => (
            <details key={String(title)} className="rounded bg-slate-100 p-4">
              <summary className="cursor-pointer font-black text-slate-950">
                {String(title)}
              </summary>
              <pre className="mt-3 max-h-80 overflow-auto rounded bg-[#071525] p-4 text-xs leading-relaxed text-white">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      ) : null}
    </section>
  );
}
