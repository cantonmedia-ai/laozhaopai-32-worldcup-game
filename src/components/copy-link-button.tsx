"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { LoadingButton } from "@/components/loading-button";

export function CopyLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <LoadingButton
      type="button"
      onClick={copy}
      loadingText="正在复制..."
      className="flex h-12 items-center justify-center gap-2 rounded bg-[#071525] font-black text-white"
    >
      <Copy size={18} /> {copied ? "Copied" : "Copy referral link"}
    </LoadingButton>
  );
}
