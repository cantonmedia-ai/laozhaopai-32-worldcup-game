import { PageShell, SectionHeader } from "@/components/app-shell";

const roundScores = [
  ["32强", "10分"],
  ["16强", "15分"],
  ["8强", "20分"],
  ["4强", "25分"],
  ["决赛冠军", "40分"],
];

const scoreBonuses = [
  ["Level 1 猜中胜方", "获得当前阶段基础分"],
  ["Level 2 猜中其中一队比分", "+5分"],
  ["Level 2 猜中两队完整比分", "+15分"],
];

const rules = [
  "每场比赛有两个独立答案：Level 1 选择胜方，Level 2 填写双方比分。",
  "Level 1 和 Level 2 不需要互相一致；你可以选择 A 队胜出，同时填写 B 队比分更高。",
  "Level 2 是保险玩法：即使胜方猜错，仍然可以靠准确比分拿到比分奖励。",
  "邀请好友不会直接加到主榜分数，主榜只计算预测得分。",
  "截止后预测自动锁定，管理员确认赛果后系统自动算分。",
  "公开排行榜只显示昵称、头像、分数与排名，不显示电话或邮箱。",
];

export default function RulesPage() {
  return (
    <PageShell active="/rules" publicMode>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <SectionHeader
          eyebrow="Rules"
          title="游戏规则"
          body="分数由两个独立答案组成：Level 1 胜方基础分，加上 Level 2 比分奖励。"
        />

        <div className="grid gap-5 md:grid-cols-2">
          <section className="card p-5">
            <h2 className="text-xl font-black text-slate-950">
              Level 1 胜方基础分
            </h2>
            <div className="mt-4 grid gap-3">
              {roundScores.map(([round, points]) => (
                <div
                  key={round}
                  className="flex items-center justify-between rounded bg-slate-100 p-3"
                >
                  <span className="font-black text-slate-700">{round}</span>
                  <span className="font-black text-[#d71920]">{points}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-xl font-black text-slate-950">
              Level 2 比分奖励
            </h2>
            <div className="mt-4 grid gap-3">
              {scoreBonuses.map(([item, points]) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded bg-slate-100 p-3"
                >
                  <span className="font-black text-slate-700">{item}</span>
                  <span className="font-black text-[#0f8a4b]">{points}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded bg-[#071525] p-3 text-sm font-semibold text-white/80">
              例子：32强猜中胜方得10分；猜中一队比分再加5分；猜中完整比分再加15分。比分奖励独立计算。
            </p>
          </section>
        </div>

        <section className="card mt-5 p-5">
          <h2 className="text-xl font-black text-slate-950">其他规则</h2>
          <ol className="mt-4 grid gap-3">
            {rules.map((rule, index) => (
              <li key={rule} className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded bg-[#d71920] font-black text-white">
                  {index + 1}
                </span>
                <span className="pt-1 font-semibold text-slate-700">
                  {rule}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </PageShell>
  );
}
