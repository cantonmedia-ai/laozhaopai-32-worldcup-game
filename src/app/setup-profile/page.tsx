import { Suspense } from "react";
import { PageShell, SectionHeader } from "@/components/app-shell";
import { SetupProfileForm } from "@/components/setup-profile-form";

export default function SetupProfilePage() {
  return (
    <PageShell active="/profile">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <SectionHeader
          eyebrow="First Login"
          title="设置你的游戏昵称"
          body="这个昵称会显示在排行榜。若你是通过好友链接加入，完成资料后系统会自动记录邀请关系。"
        />
        <Suspense
          fallback={
            <div className="card p-5 font-bold text-slate-600">
              Loading profile form...
            </div>
          }
        >
          <SetupProfileForm />
        </Suspense>
      </main>
    </PageShell>
  );
}
