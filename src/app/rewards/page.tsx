import { Gift, Medal, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { rewards } from "@/lib/demo-data";

const pointRules = [
  ["Level 1 猜中胜方", "按阶段给基础分"],
  ["32强", "10分"],
  ["16强", "15分"],
  ["8强", "20分"],
  ["4强", "25分"],
  ["决赛冠军", "40分"],
  ["Level 2 猜中一队比分", "+5分"],
  ["Level 2 猜中完整比分", "+15分"],
];

const referralScheme = [
  "每位玩家都有自己的邀请码和邀请链接。",
  "朋友通过你的链接加入后，会进入你当前开放的队伍。",
  "每队最多5人，包含队长/owner。",
  "每队至少邀请2位朋友才算成队。",
  "队伍满5人后，下一位朋友会自动进入你的下一支队伍。",
  "队员也有自己的邀请码，可以继续邀请朋友组成自己的队伍。",
  "邀请关系只用于好友战区、人气榜和特别奖励，不会直接加到预测主分。",
];

const claimRules = [
  "主榜奖励以最终总分排名为准。",
  "同分时依次比较准确率、正确预测数、较早完成 profile 时间。",
  "人气邀请王以有效邀请人数为准。",
  "管理员会在后台分配奖品并生成 claim code。",
  "领奖时可能需要核对手机号、昵称和 claim code。",
  "被封锁或异常账号不能领取奖励。",
];

export default function RewardsPage() {
  return (
    <PageShell active="/rewards" publicMode>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeader
          eyebrow="Rewards"
          title="奖品、积分与邀请玩法"
          body="预测分数决定主榜排名，邀请好友决定人气榜和战队玩法。两套系统分开计算，公平又好玩。"
        />

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="主榜冠军" value="总分第1" tone="gold" />
          <StatCard label="每轮奖励" value="Round Winner" tone="green" />
          <StatCard label="人气奖励" value="Invite King" tone="navy" />
          <StatCard label="领取方式" value="Claim Code" />
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {rewards.map((reward) => (
            <div key={reward.id} className="card flex gap-4 p-5">
              <div className="grid size-12 shrink-0 place-items-center rounded bg-[#f4c542] text-[#071525]">
                <Gift />
              </div>
              <div>
                <p className="font-black text-slate-950">{reward.rewardName}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {reward.rankType}
                  {reward.rankPosition ? ` · 第${reward.rankPosition}名` : ""}
                </p>
                <span className="mt-3 inline-flex rounded bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {reward.claimStatus}
                </span>
              </div>
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="card p-5">
            <div className="flex items-center gap-2">
              <Trophy className="text-[#d71920]" />
              <h2 className="text-xl font-black text-slate-950">
                积分系统
              </h2>
            </div>
            <div className="mt-4 grid gap-3">
              {pointRules.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded bg-slate-100 p-3"
                >
                  <span className="font-black text-slate-700">{label}</span>
                  <span className="font-black text-[#d71920]">{value}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded bg-[#071525] p-3 text-sm font-semibold text-white/80">
              Level 1 胜方和 Level 2 比分是独立答案。即使胜方猜错，仍然有机会靠比分拿奖励分。
            </p>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2">
              <UsersRound className="text-[#0f8a4b]" />
              <h2 className="text-xl font-black text-slate-950">
                Referral Scheme
              </h2>
            </div>
            <ol className="mt-4 grid gap-3">
              {referralScheme.map((rule, index) => (
                <li key={rule} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded bg-[#0f8a4b] text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-sm font-semibold text-slate-700">
                    {rule}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="card p-5">
            <div className="flex items-center gap-2">
              <Medal className="text-[#f4c542]" />
              <h2 className="text-xl font-black text-slate-950">
                奖励类别
              </h2>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                ["主榜奖励", "最终总分排名 Top 1-10。"],
                ["每轮冠军", "单轮分数最高玩家。"],
                ["人气邀请王", "有效邀请人数最高玩家。"],
                ["好友战区荣誉", "队伍内好友排行榜展示。"],
              ].map(([label, body]) => (
                <div key={label} className="rounded bg-slate-100 p-3">
                  <p className="font-black text-slate-800">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-[#d71920]" />
              <h2 className="text-xl font-black text-slate-950">
                领取规则
              </h2>
            </div>
            <ol className="mt-4 grid gap-3">
              {claimRules.map((rule, index) => (
                <li key={rule} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded bg-[#d71920] text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-sm font-semibold text-slate-700">
                    {rule}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
