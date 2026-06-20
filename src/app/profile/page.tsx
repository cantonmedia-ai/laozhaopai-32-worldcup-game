import { PageShell, SectionHeader } from "@/components/app-shell";
import { getMe } from "@/lib/demo-data";

export default function ProfilePage() {
  const me = getMe();

  return (
    <PageShell active="/profile">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <SectionHeader eyebrow="Profile" title="我的资料" />
        <form className="card grid gap-4 p-5">
          <label className="grid gap-2 font-bold">
            公开昵称
            <input className="h-12 rounded border border-slate-200 px-3" defaultValue={me.displayName} />
          </label>
          <label className="grid gap-2 font-bold">
            电话
            <input className="h-12 rounded border border-slate-200 px-3" defaultValue={me.phone} />
          </label>
          <label className="grid gap-2 font-bold">
            支持球队
            <input className="h-12 rounded border border-slate-200 px-3" defaultValue={me.favoriteTeam} />
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" className="size-5" defaultChecked={me.acceptMarketing} />
            接收活动提醒
          </label>
          <button className="h-12 rounded bg-[#071525] font-black text-white">保存资料</button>
        </form>
      </main>
    </PageShell>
  );
}
