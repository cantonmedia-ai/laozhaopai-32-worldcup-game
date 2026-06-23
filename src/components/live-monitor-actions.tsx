"use client";

import { Download, Copy } from "lucide-react";

export function LiveMonitorActions({
  report,
  exportHref,
}: {
  report: string;
  exportHref: string;
}) {
  async function copyReport() {
    await navigator.clipboard.writeText(report);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copyReport}
        className="flex h-10 items-center justify-center gap-2 rounded bg-[#071525] px-4 text-sm font-black text-white"
      >
        <Copy size={16} /> Copy Live Issue Report
      </button>
      <a
        href={exportHref}
        className="flex h-10 items-center justify-center gap-2 rounded bg-[#f4c542] px-4 text-sm font-black text-[#071525]"
      >
        <Download size={16} /> Export Logs CSV
      </a>
    </div>
  );
}
