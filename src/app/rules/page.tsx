import { PageShell, SectionHeader } from "@/components/app-shell";
import { knockoutStageOrder, stageDescription, stageDisplayName } from "@/lib/stage-labels";

const roundScores = [
  ["last_32", "+5 points"],
  ["last_16", "+8 points"],
  ["last_8", "+12 points"],
  ["last_4", "+18 points"],
  ["final", "+30 points"],
] as const;

const rules = [
  "每场淘汰赛选择一个你认为会晋级或获胜的队伍。",
  "每场比赛截止后自动锁定，玩家不能再修改答案。",
  "后台会再次检查 lock time，玩家不能靠修改浏览器时间迟交。",
  "管理员录入实际赢家后，系统自动计算分数并更新排行榜。",
  "同一场比赛不会重复加分，避免重复算分。",
  "公开排行榜只显示昵称、头像、分数与排名，不显示电话或邮箱。",
];

export default function RulesPage() {
  return (
    <PageShell active="/rules" publicMode>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <SectionHeader
          eyebrow="Rules"
          title="淘汰赛赢家战规则"
          body="Knockout Winner Challenge 是个人赢家预测战。从 32强生死战 / Round of 32 到 冠军终极战 / Grand Final，猜中每场赢家即可得分。"
        />

        <div className="grid gap-5 md:grid-cols-2">
          <section className="card p-5">
            <h2 className="text-xl font-black text-slate-950">
              赢家预测积分
            </h2>
            <div className="mt-4 grid gap-3">
              {roundScores.map(([round, points]) => (
                <div
                  key={round}
                  className="grid gap-3 rounded bg-slate-100 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <span className="font-black text-slate-700">
                    {stageDisplayName(round).split("\n").map((line) => (
                      <span key={line} className="block leading-tight">
                        {line}
                      </span>
                    ))}
                    <span className="mt-1 block text-xs font-bold text-slate-500">
                      {stageDescription(round)}
                    </span>
                  </span>
                  <span className="font-black text-[#d71920]">{points}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-xl font-black text-slate-950">
              Stage Flow
            </h2>
            <div className="mt-4 grid gap-2">
              {knockoutStageOrder.map((round) => (
                <div key={round} className="rounded bg-[#071525] p-3 font-black text-white">
                  {stageDisplayName(round).split("\n").map((line) => (
                    <span key={line} className="block leading-tight">
                      {line}
                    </span>
                  ))}
                </div>
              ))}
            </div>
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
