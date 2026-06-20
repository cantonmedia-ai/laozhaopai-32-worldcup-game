"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { getTeam, matches } from "@/lib/demo-data";

export default function AdminResultsPage() {
  const [confirmed, setConfirmed] = useState(false);
  const firstMatch = matches[0];

  return (
    <AdminLayout active="/admin/results">
      <SectionHeader
        eyebrow="Result Entry"
        title="赛果录入"
        body="确认录入后，系统会计算所有玩家得分、更新排行榜并写入审计记录。"
      />
      <form className="card grid max-w-2xl gap-4 p-5">
        <label className="grid gap-2 font-bold">
          Select match
          <select className="h-12 rounded border border-slate-200 px-3">
            {matches.map((match) => (
              <option key={match.id}>Match {match.matchNo}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 font-bold">
            {getTeam(firstMatch.teamAId).name} score
            <input type="number" min={0} className="h-12 rounded border border-slate-200 px-3" defaultValue={2} />
          </label>
          <label className="grid gap-2 font-bold">
            {getTeam(firstMatch.teamBId).name} score
            <input type="number" min={0} className="h-12 rounded border border-slate-200 px-3" defaultValue={0} />
          </label>
        </div>
        <label className="grid gap-2 font-bold">
          Winner team
          <select className="h-12 rounded border border-slate-200 px-3">
            <option>{getTeam(firstMatch.teamAId).name}</option>
            <option>{getTeam(firstMatch.teamBId).name}</option>
          </select>
        </label>
        <label className="grid gap-2 font-bold">
          Reason / note
          <textarea className="min-h-24 rounded border border-slate-200 p-3" placeholder="Optional audit note" />
        </label>
        <button
          type="button"
          onClick={() => setConfirmed(true)}
          className="h-12 rounded bg-[#d71920] font-black text-white"
        >
          确认录入
        </button>
        {confirmed ? (
          <div className="rounded bg-green-50 p-4 font-bold text-green-800">
            Demo: 已确认赛果。连接 Supabase 后会执行 result RPC、score calculation 和 audit log。
          </div>
        ) : null}
      </form>
    </AdminLayout>
  );
}
