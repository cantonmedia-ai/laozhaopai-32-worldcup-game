"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyStoredReferralCode, getStoredReferralCode } from "@/lib/referrals";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/game";
  return value;
}

export function SetupProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredOutlet, setPreferredOutlet] = useState("Canton Kitchen");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [acceptMarketing, setAcceptMarketing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const storedReferralCode = getStoredReferralCode();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = displayName.trim();
    if (cleanName.length < 2 || cleanName.length > 20) {
      setMessage("昵称需要 2-20 个字符。");
      return;
    }

    if (isEmailLike(cleanName)) {
      setMessage("昵称不能使用邮箱格式。");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      if (!isSupabaseConfigured()) {
        setMessage("Demo 已保存。连接 Supabase 后会更新 profile 并记录邀请关系。");
        router.push(nextPath);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("请先登录。");

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: cleanName,
          phone: phone.trim(),
          preferred_outlet: preferredOutlet,
          favorite_team: favoriteTeam.trim(),
          accept_marketing: acceptMarketing,
          profile_completed: true,
          display_name_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("auth_user_id", user.id);

      if (error) throw new Error(error.message);

      await applyStoredReferralCode();
      router.push(nextPath);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card grid gap-4 p-5">
      {storedReferralCode ? (
        <div className="rounded bg-green-50 p-3 text-sm font-bold text-green-800">
          已检测到邀请码：{storedReferralCode}。完成资料后会自动加入好友战区。
        </div>
      ) : null}

      <label className="grid gap-2 font-bold">
        昵称
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="h-12 rounded border border-slate-200 px-3 font-semibold"
          placeholder="2-20个字符，不可使用邮箱格式"
          minLength={2}
          maxLength={20}
          required
        />
      </label>
      <label className="grid gap-2 font-bold">
        电话
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="h-12 rounded border border-slate-200 px-3 font-semibold"
          placeholder="用于奖品领取"
        />
      </label>
      <label className="grid gap-2 font-bold">
        常去分店
        <select
          value={preferredOutlet}
          onChange={(event) => setPreferredOutlet(event.target.value)}
          className="h-12 rounded border border-slate-200 px-3 font-semibold"
        >
          <option>Canton Kitchen</option>
          <option>Lao Zhao Pai</option>
          <option>Brainwave Games</option>
        </select>
      </label>
      <label className="grid gap-2 font-bold">
        支持球队
        <input
          value={favoriteTeam}
          onChange={(event) => setFavoriteTeam(event.target.value)}
          className="h-12 rounded border border-slate-200 px-3 font-semibold"
          placeholder="例如：阿根廷"
        />
      </label>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          className="size-5"
          checked={acceptMarketing}
          onChange={(event) => setAcceptMarketing(event.target.checked)}
        />
        接收下一轮预测提醒与奖品通知
      </label>
      <button
        disabled={saving}
        className="h-12 rounded bg-[#d71920] font-black text-white hover:bg-red-700 disabled:bg-slate-400"
      >
        {saving ? "保存中..." : "完成，开始预测之旅！"}
      </button>
      {message ? (
        <p className="rounded bg-slate-100 p-3 text-sm font-bold text-slate-700">
          {message}
        </p>
      ) : null}
    </form>
  );
}
