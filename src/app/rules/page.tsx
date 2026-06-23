import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Medal,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { PageShell, SectionHeader } from "@/components/app-shell";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const gameOnePoints = [
  ["十六强", "每猜中一个国家", "1分"],
  ["八强", "每猜中一个国家", "2分"],
  ["四强", "每猜中一个国家", "4分"],
  ["决赛", "每猜中一个国家", "6分"],
  ["冠军", "猜中冠军", "10分"],
];

const gameTwoPoints = [
  ["三十二强", "1分", "0 / 1 / 3分", "4分"],
  ["十六强", "2分", "0 / 1 / 3分", "5分"],
  ["八强", "4分", "0 / 1 / 3分", "7分"],
  ["四强", "6分", "0 / 1 / 3分", "9分"],
  ["决赛", "10分", "0 / 1 / 3分", "13分"],
];

const scoreAccuracyRows = [
  ["双方进球数都没有猜中", "0分"],
  ["只猜中其中一方进球数", "1分"],
  ["双方进球数都猜中", "3分"],
];

const statusRows = [
  ["开放预测中", "玩家可以提交预测。"],
  ["即将截止", "距离截止时间很近，请尽快确认。"],
  ["预测已截止", "不能再提交或修改预测。"],
  ["等待赛果", "系统等待官方赛果确认。"],
  ["已完成计分", "系统已经计算并写入积分。"],
  ["截止时间等待赛程确认", "赛程接口还没有公布对应比赛时间。"],
];

function RuleCard({
  title,
  eyebrow,
  children,
  tone = "white",
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  tone?: "white" | "navy" | "green";
}) {
  const toneClass =
    tone === "navy"
      ? "bg-[#071525] text-white"
      : tone === "green"
        ? "bg-[#0f8a4b] text-white"
        : "bg-white text-slate-950";

  return (
    <section className={`rounded-lg p-5 shadow-sm md:p-7 ${toneClass}`}>
      {eyebrow ? (
        <p
          className={`mb-2 text-xs font-black uppercase tracking-[0.24em] ${
            tone === "white" ? "text-[#0f8a4b]" : "text-[#f4c542]"
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-black leading-tight md:text-3xl">{title}</h2>
      <div
        className={`mt-5 space-y-5 text-base leading-relaxed ${
          tone === "white" ? "text-slate-700" : "text-white/85"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

function FormulaBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#f4c542]/40 bg-[#f4c542]/15 p-4 font-black text-[#071525] shadow-sm">
      {children}
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-[#071525] text-white">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-black">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.join("-")} className="border-t border-slate-200">
                {row.map((cell, index) => (
                  <td
                    key={`${cell}-${index}`}
                    className="px-4 py-3 font-bold text-slate-700"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <CheckCircle2 className="mt-1 size-5 shrink-0 text-[#0f8a4b]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function RulesPage() {
  let isSignedIn = false;

  if (hasSupabaseServerEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isSignedIn = Boolean(user);
  }

  const playHref = isSignedIn
    ? "/road-to-champion"
    : "/login?next=/road-to-champion&mode=signup";

  return (
    <PageShell active="/rules" publicMode={!isSignedIn}>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-12">
        <SectionHeader
          eyebrow="规则说明"
          title="游戏规则"
          body="预测世界杯淘汰赛，个人积分与团队积分一起冲榜。"
        />

        <section className="mb-8 rounded-lg bg-[#071525] p-5 text-white shadow-sm md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#f4c542]">
                Brainwave Games
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
                世界杯淘汰赛预测挑战
              </h2>
              <p className="mt-4 max-w-2xl text-white/75">
                先完成个人预测，再通过团队积分放大成绩。所有预测都必须在对应截止时间前提交，系统会按官方赛程与赛果自动计分。
              </p>
            </div>
            <Link
              href={playHref}
              className="inline-flex h-12 items-center justify-center gap-2 rounded bg-[#d71920] px-5 text-base font-black text-white transition hover:bg-red-700"
            >
              开始参加
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        <div className="space-y-8">
          <RuleCard title="游戏一：最强预测家" eyebrow="晋级名单预测">
            <p>
              游戏一是晋级名单预测游戏，不是每场比赛预测。玩家需要预测哪些国家会进入十六强、八强、四强、决赛，以及最终冠军。
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-slate-100 p-4">
                <div className="mb-3 flex items-center gap-2 font-black text-slate-950">
                  <Trophy className="size-5 text-[#d71920]" />
                  预测项目
                </div>
                <BulletList
                  items={[
                    "预测进入十六强的国家",
                    "预测进入八强的国家",
                    "预测进入四强的国家",
                    "预测进入决赛的国家",
                    "预测最终冠军国家",
                  ]}
                />
              </div>

              <div className="rounded-lg bg-slate-100 p-4">
                <div className="mb-3 flex items-center gap-2 font-black text-slate-950">
                  <CalendarClock className="size-5 text-[#d71920]" />
                  截止时间
                </div>
                <p>
                  游戏一截止时间为十六强第一场比赛正式开始前十五分钟。系统会通过赛程接口自动读取开赛时间并计算截止时间。
                </p>
              </div>
            </div>

            <SimpleTable
              headers={["预测阶段", "计分方式", "猜中分数"]}
              rows={gameOnePoints}
            />

            <FormulaBox>
              游戏一最终获得分 = 游戏一个人猜中分 + 游戏一团队累计分
            </FormulaBox>

            <p>
              团队累计分包含玩家自己的分数，因为玩家本身也是团队成员之一。如果玩家没有加入团队，游戏一团队累计分为零，最终获得分只计算个人猜中分。
            </p>

            <div className="rounded-lg bg-slate-100 p-4 text-slate-700">
              <p className="font-black text-slate-950">计分例子</p>
              <p className="mt-2">
                你在十六强猜中四个国家得到四分；团队五位成员分别得到四分、三分、四分、两分、五分，团队累计分为十八分。你的游戏一最终获得分为四分加十八分，共二十二分。
              </p>
            </div>
          </RuleCard>

          <RuleCard title="游戏二：淘汰赛赢家战" eyebrow="单场比赛预测">
            <p>
              游戏二是每场比赛预测游戏。从三十二强开始，每一场淘汰赛都需要预测赢家国家，以及双方最终比分。每场比赛独立计分，也有自己的截止时间。
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-slate-100 p-4">
                <div className="mb-3 flex items-center gap-2 font-black text-slate-950">
                  <ShieldCheck className="size-5 text-[#d71920]" />
                  每场需要填写
                </div>
                <BulletList
                  items={[
                    "预测赢家国家",
                    "预测国家甲进球数",
                    "预测国家乙进球数",
                    "平局比分仍然必须选择最终晋级国家",
                    "进球数只能输入零或正整数",
                  ]}
                />
              </div>

              <div className="rounded-lg bg-slate-100 p-4">
                <div className="mb-3 flex items-center gap-2 font-black text-slate-950">
                  <CalendarClock className="size-5 text-[#d71920]" />
                  单场截止时间
                </div>
                <p>
                  每场比赛预测截止时间为该场比赛正式开始前十五分钟。没有截止的比赛仍可继续预测，已经截止的比赛不能再提交或修改。
                </p>
                <p className="mt-3 rounded bg-white p-3 font-black text-slate-950">
                  该场比赛预测截止时间 = 该场比赛开赛时间 - 十五分钟
                </p>
              </div>
            </div>

            <SimpleTable
              headers={["比赛阶段", "猜中赢家", "比分准确分", "单场最高分"]}
              rows={gameTwoPoints}
            />

            <SimpleTable
              headers={["比分预测情况", "比分准确分"]}
              rows={scoreAccuracyRows}
            />

            <FormulaBox>
              游戏二单场个人分 = 赢家分 + 比分准确分
            </FormulaBox>
            <FormulaBox>
              游戏二最终获得分 = 游戏二个人单场分 + 游戏二团队累计分
            </FormulaBox>

            <p>
              比分准确分只计算最高符合项，不重复叠加。双方进球数都猜中时只得三分，不会再额外叠加一分。
            </p>

            <div className="rounded-lg bg-slate-100 p-4 text-slate-700">
              <p className="font-black text-slate-950">计分例子</p>
              <p className="mt-2">
                官方结果为巴西二比一日本。玩家预测巴西胜，比分二比一，三十二强赢家得一分，双方比分都猜中得三分，单场个人分共四分。
              </p>
            </div>
          </RuleCard>

          <RuleCard title="团队模式" eyebrow="不是第三个预测游戏" tone="navy">
            <p>
              团队模式不是第三个预测游戏，而是让玩家组队一起参加游戏一和游戏二。团队分会加入玩家最终获得分，也会用于团队排行榜。
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-white/10 p-4">
                <UsersRound className="mb-3 size-6 text-[#f4c542]" />
                <p className="font-black text-white">团队人数</p>
                <p className="mt-2">每队最多五人，一位队长加四位成员。有效团队至少需要两人。</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <Medal className="mb-3 size-6 text-[#f4c542]" />
                <p className="font-black text-white">邀请规则</p>
                <p className="mt-2">每位玩家只有一个邀请码。队长分享自己的邀请码，朋友加入后进入该队。</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <ShieldCheck className="mb-3 size-6 text-[#f4c542]" />
                <p className="font-black text-white">自动分队</p>
                <p className="mt-2">如果当前团队已满，同一个邀请码会自动创建下一支队伍，队长先加入新队，再加入新成员。</p>
              </div>
            </div>

            <div className="grid gap-4 rounded-lg bg-white/10 p-4">
              <div>
                <p className="font-black text-white">同一个 owner 可以拥有多支队伍</p>
                <p className="mt-2">
                  每一支队伍都是独立参赛单位，都会独立计算团队分，也会在团队排行榜上互相竞争。
                  即使几支队伍是同一个 owner 创建，分数也不能合并成一个 owner 总团队分。
                </p>
              </div>

              <div className="rounded bg-white/10 p-4">
                <p className="font-black text-white">例子</p>
                <div className="mt-3 grid gap-2 text-sm font-semibold md:grid-cols-3">
                  <div className="rounded bg-[#071525]/40 p-3">
                    <p className="font-black text-[#f4c542]">Team 1</p>
                    <p>Deric + A + B + C + D</p>
                  </div>
                  <div className="rounded bg-[#071525]/40 p-3">
                    <p className="font-black text-[#f4c542]">Team 2</p>
                    <p>Deric + E + F + G + H</p>
                  </div>
                  <div className="rounded bg-[#071525]/40 p-3">
                    <p className="font-black text-[#f4c542]">Team 3</p>
                    <p>Deric + I + J</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-black text-white">团队分如何计算</p>
                <p className="mt-2">
                  Owner 的个人分数会计入他拥有的每一支队伍。所以 Team 1、Team 2、Team 3
                  都可以加入 Deric 的个人分数来冲团队榜。每一支队伍只计算自己队内成员的分数，
                  不会和同一个 owner 的其他队伍合并。
                </p>
              </div>

              <div>
                <p className="font-black text-white">Owner 个人最终得分如何计算</p>
                <p className="mt-2">
                  虽然 owner 的个人分数会帮助每一支自己创建的队伍，但 owner 自己个人最终得分
                  只领取第一队 / 主队的团队加成。第二队、第三队的团队加成不会再重复加回 owner
                  的个人总分。
                </p>
              </div>

              <div>
                <p className="font-black text-white">队友如何领取团队加成</p>
                <p className="mt-2">
                  队友只领取自己所在队伍的团队加成。Team 2 的队友领取 Team 2 的团队加成，
                  Team 3 的队友领取 Team 3 的团队加成。
                </p>
              </div>

              <BulletList
                items={[
                  "同一个 owner 可以创建多支队伍",
                  "每一队独立参赛，独立上团队排行榜",
                  "同一个 owner 的多支队伍可以互相竞争",
                  "Owner 的个人分数会计入每一支自己创建的队伍",
                  "Owner 自己只领取第一队 / 主队的团队加成",
                  "Owner 不重复领取第二队、第三队的团队加成",
                  "队友领取自己所在队伍的团队加成",
                  "团队分不能按 owner 合并",
                ]}
              />
            </div>

            <p>
              如果队长拥有多支团队，队长个人最终总分只使用主队的团队累计分。第二队、第三队等队伍会参加团队排行榜，但不会重复加到队长个人分数里。
            </p>
          </RuleCard>

          <RuleCard title="个人总分与排行榜" eyebrow="最终冲榜规则">
            <FormulaBox>
              个人最终总分 = 游戏一最终获得分 + 游戏二最终获得分
            </FormulaBox>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-slate-100 p-4">
                <p className="font-black text-slate-950">个人分数字段</p>
                <BulletList
                  items={[
                    "游戏一个人猜中分",
                    "游戏一团队累计分",
                    "游戏一最终获得分",
                    "游戏二个人单场分",
                    "游戏二团队累计分",
                    "游戏二最终获得分",
                    "个人最终总分",
                  ]}
                />
              </div>

              <div className="rounded-lg bg-slate-100 p-4">
                <p className="font-black text-slate-950">排行榜</p>
                <BulletList
                  items={[
                    "游戏一个人榜",
                    "游戏二个人榜",
                    "个人总榜",
                    "团队排行榜",
                  ]}
                />
              </div>
            </div>
          </RuleCard>

          <RuleCard title="预测状态与提交规则" eyebrow="重要提醒" tone="green">
            <SimpleTable headers={["状态", "说明"]} rows={statusRows} />

            <div className="rounded-lg bg-white/10 p-4">
              <p className="font-black text-white">提交提醒</p>
              <p className="mt-2">
                预测必须在对应截止时间前提交。截止后不能提交或修改。比赛结果以官方最终赛果为准，系统会自动计算个人分、团队分与排行榜。
              </p>
            </div>
          </RuleCard>
        </div>
      </main>
    </PageShell>
  );
}
