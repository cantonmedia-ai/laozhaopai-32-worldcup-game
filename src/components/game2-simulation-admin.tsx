"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Loader2, Trash2 } from "lucide-react";

type MatchResult = {
  player_name: string;
  team_name: string;
  match_label: string;
  round_key: string;
  official_winner: string;
  official_score: string;
  predicted_winner: string;
  predicted_score: string;
  winner_points: number;
  score_accuracy_points: number;
  individual_match_score: number;
  team_match_accumulated_score: number;
  match_final_earned_score: number;
};

type PlayerSummary = {
  player_name: string;
  team_name: string;
  game2_individual_total_score: number;
  game2_team_accumulated_total_score: number;
  game2_final_earned_total_score: number;
};

type TeamSummary = {
  team_name: string;
  member_count: number;
  members: string[];
  game2_team_accumulated_score: number;
};

type SimulationResult = {
  ok: boolean;
  message?: string;
  validation?: Record<string, number>;
  match_results?: MatchResult[];
  player_summary?: PlayerSummary[];
  team_summary?: TeamSummary[];
  raw?: Record<string, unknown>;
  error?: string;
};

const roundLabels: Record<string, string> = {
  last_32: "三十二强",
  last_16: "十六强",
  last_8: "八强",
  last_4: "四强",
  final: "决赛",
};

function display(value: unknown) {
  if (typeof value === "number") return value;
  return String(value ?? "-");
}

export function Game2SimulationAdmin() {
  const [busy, setBusy] = useState<"run" | "clear" | "">("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<SimulationResult | null>(null);

  async function loadCurrentSimulation() {
    try {
      const response = await fetch("/api/admin/game2-simulation/current", {
        cache: "no-store",
      });
      const data = (await response.json()) as SimulationResult;
      if (!response.ok) throw new Error(data.error ?? "Unable to load simulation.");
      if (data.match_results?.length) {
        setResult(data);
        setMessage(data.message ?? "");
      }
    } catch {
      // Empty state is allowed before the first simulation run.
    }
  }

  useEffect(() => {
    loadCurrentSimulation();
  }, []);

  async function runSimulation() {
    setBusy("run");
    setMessage("");

    try {
      const response = await fetch("/api/admin/game2-simulation/run", {
        method: "POST",
      });
      const data = (await response.json()) as SimulationResult;
      if (!response.ok) throw new Error(data.error ?? "Unable to run simulation.");

      setResult(data);
      setMessage(
        data.message ??
          "游戏二模拟测试完成。分数已由真实游戏二计分逻辑自动生成。",
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
      const response = await fetch("/api/admin/game2-simulation/clear", {
        method: "POST",
      });
      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to clear simulation.");

      setResult(null);
      setMessage(data.message ?? "Game 2 simulation data cleared.");
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
          Game 2 Simulation Test
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600">
          Creates simulation players, teams, matches, predictions, and official results,
          then runs the real Game 2 scoring logic. All simulation rows are marked with{" "}
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
          Run Game 2 Simulation
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
          Clear Game 2 Simulation Data
        </button>
      </div>

      {message ? (
        <div className="mx-5 mb-5 rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
          {message}
        </div>
      ) : null}

      {result?.validation ? (
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-6">
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

      {result?.match_results?.length ? (
        <div className="border-t border-slate-100 p-5">
          <h3 className="text-xl font-black text-slate-950">逐场计算结果</h3>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-[1720px] text-left text-sm">
                <thead className="bg-[#071525] text-white">
                  <tr>
                    {[
                      "玩家名称",
                      "所属团队",
                      "比赛",
                      "比赛阶段",
                      "官方赢家",
                      "官方比分",
                      "预测赢家",
                      "预测比分",
                      "赢家分",
                      "比分准确分",
                      "本场个人分",
                      "本场团队累计分",
                      "本场最终获得分",
                    ].map((header) => (
                      <th key={header} className="px-3 py-3 font-black">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.match_results.map((row, index) => (
                    <tr
                      key={`${row.player_name}-${row.match_label}-${index}`}
                      className="border-t border-slate-200"
                    >
                      <td className="px-3 py-3 font-black">{row.player_name}</td>
                      <td className="px-3 py-3 font-bold">{row.team_name}</td>
                      <td className="px-3 py-3">{row.match_label}</td>
                      <td className="px-3 py-3">{roundLabels[row.round_key] ?? row.round_key}</td>
                      <td className="px-3 py-3">{row.official_winner}</td>
                      <td className="px-3 py-3">{row.official_score}</td>
                      <td className="px-3 py-3">{row.predicted_winner}</td>
                      <td className="px-3 py-3">{row.predicted_score}</td>
                      <td className="px-3 py-3">{display(row.winner_points)}</td>
                      <td className="px-3 py-3">{display(row.score_accuracy_points)}</td>
                      <td className="px-3 py-3 font-black text-[#d71920]">
                        {display(row.individual_match_score)}
                      </td>
                      <td className="px-3 py-3 font-black text-[#0f8a4b]">
                        {display(row.team_match_accumulated_score)}
                      </td>
                      <td className="px-3 py-3 font-black text-[#d71920]">
                        {display(row.match_final_earned_score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {result?.player_summary?.length ? (
        <div className="border-t border-slate-100 p-5">
          <h3 className="text-xl font-black text-slate-950">玩家汇总</h3>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  {["玩家名称", "所属团队", "游戏二个人总分", "游戏二团队累计总分", "游戏二最终获得总分"].map(
                    (header) => (
                      <th key={header} className="px-4 py-3 font-black">
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {result.player_summary.map((row) => (
                  <tr key={row.player_name} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-black">{row.player_name}</td>
                    <td className="px-4 py-3">{row.team_name}</td>
                    <td className="px-4 py-3">{row.game2_individual_total_score}</td>
                    <td className="px-4 py-3">{row.game2_team_accumulated_total_score}</td>
                    <td className="px-4 py-3 font-black text-[#d71920]">
                      {row.game2_final_earned_total_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  {team.game2_team_accumulated_score} 分
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result?.raw ? (
        <div className="grid gap-3 border-t border-slate-100 p-5">
          {[
            ["官方模拟比赛结果", result.raw.official_match_results],
            ["每位玩家的预测", result.raw.player_predictions],
            ["团队成员列表", result.raw.team_members],
            ["系统计算结果 JSON", result.raw.calculated_json],
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
