import Link from "next/link";
import { ArrowRight, CalendarClock, Gift, Medal, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

const games = [
  {
    no: "Game 1",
    cn: "最强预测家",
    en: "Ultimate Predictor",
    status: "现在开放 / Open Now",
    intro:
      "在小组赛阶段预测哪些球队会进入16强、8强、4强、决赛，以及最终冠军。",
    rules: [
      "玩家必须登录账号后才可以参加。",
      "玩家需要在截止日期前提交预测。",
      "截止日期后，预测答案将会锁定，不能再修改。",
      "小组赛结束后，系统会根据实际晋级球队与玩家预测进行计分。",
      "积分进入最强预测家排行榜，排名最高的玩家赢取游戏1奖品。",
    ],
    points: [
      ["猜中进入16强球队", "每队 1分"],
      ["猜中进入8强球队", "每队 2分"],
      ["猜中进入4强球队", "每队 4分"],
      ["猜中进入决赛球队", "每队 6分"],
      ["猜中最终冠军", "10分"],
    ],
    prize: "选出10位赢家，第1名至第10名玩家获得游戏1奖品。",
    icon: Trophy,
  },
  {
    no: "Game 2",
    cn: "个人淘汰赛赢家战",
    en: "Knockout Winner Challenge",
    status: "等待32强确认 / Opens after Round of 32",
    intro:
      "从32强名单和比赛对阵确认后开放，玩家预测每一场淘汰赛的赢家。",
    rules: [
      "玩家必须登录账号后才可以参加。",
      "每一场比赛都有自己的截止时间。",
      "玩家需要为每一场淘汰赛选择赢家。",
      "每场比赛截止后，该场预测自动锁定。",
      "锁定后不能新增、修改或删除答案。",
      "比赛结束后，系统根据实际赢家进行计分。",
    ],
    points: [
      ["32强生死战 / Round of 32", "每场 1分"],
      ["16强争霸战 / Sweet 16", "每场 2分"],
      ["八强决战 / Elite 8", "每场 4分"],
      ["四强王者战 / Final 4", "每场 6分"],
      ["冠军终极战 / Grand Final", "每场 10分"],
    ],
    prize: "选出10位赢家，第1名至第10名玩家获得游戏2奖品。",
    icon: ShieldCheck,
  },
  {
    no: "Game 3",
    cn: "团队淘汰赛赢家战",
    en: "Team Knockout Winner Challenge",
    status: "组队开放中 / Team Formation Open",
    intro:
      "玩家可以创建团队或加入朋友的团队，团队成员一起预测淘汰赛赢家，冲击团队排行榜。",
    rules: [
      "玩家必须登录账号后才可以创建或加入团队。",
      "玩家可以创建自己的团队，并邀请朋友加入。",
      "玩家也可以输入朋友的邀请码加入团队。",
      "每位玩家只能加入一个团队。",
      "团队预测将在32强名单确认后开放。",
      "团队积分根据成员预测表现计算。",
    ],
    points: [
      ["32强生死战 / Round of 32", "每场 1分"],
      ["16强争霸战 / Sweet 16", "每场 2分"],
      ["八强决战 / Elite 8", "每场 4分"],
      ["四强王者战 / Final 4", "每场 6分"],
      ["冠军终极战 / Grand Final", "每场 10分"],
    ],
    prize: "选出3组团队赢家，第1名至第3名团队获得游戏3团队奖品。",
    icon: UsersRound,
  },
] as const;

const stageDescriptions = [
  ["32强生死战", "Round of 32", "第一轮淘汰正式开始，输一场就回家。"],
  ["16强争霸战", "Sweet 16", "真正强队开始碰头，谁能继续冲冠军？"],
  ["八强决战", "Elite 8", "进入八强，每一场都是硬仗。"],
  ["四强王者战", "Final 4", "距离冠军只差一步，王者气势正式爆发。"],
  ["冠军终极战", "Grand Final", "最后一战，决定谁是世界冠军！"],
];

const prizeSummary = [
  ["游戏 1：最强预测家奖", "10位玩家"],
  ["游戏 2：个人淘汰赛赢家战奖", "10位玩家"],
  ["游戏 3：团队淘汰赛赢家战奖", "3组团队"],
  ["Grand Prize 终极大奖", "1位玩家"],
];

const playerFlow = [
  "登录或注册账号。",
  "完成玩家资料：昵称和 WhatsApp 号码。",
  "小组赛阶段先参加游戏1：最强预测家。",
  "创建或加入团队，为游戏3做准备。",
  "等待32强名单和淘汰赛对阵确认。",
  "每一轮回到游戏页面，在截止日期前提交预测。",
  "比赛结果确认后查看积分与排行榜。",
  "活动结束后根据排行榜和总积分确认赢家。",
];

const reminders = [
  "每位玩家只允许使用一个账号参加。",
  "WhatsApp 号码只用于中奖通知，请确保填写正确。",
  "所有预测必须在指定截止日期前提交。",
  "预测一旦提交后，不能再修改答案。",
  "比赛结果以官方最终结果为准。",
  "如果发现重复账号、作弊行为或不公平操作，主办方有权取消相关资格。",
  "如果中奖者无法联系，主办方有权重新安排奖品处理方式。",
  "主办方保留修改游戏规则、积分规则、奖品内容和活动安排的权利。",
  "如有任何争议，主办方拥有最终决定权。",
];

export default async function RulesPage() {
  let isSignedIn = false;

  if (hasSupabaseServerEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isSignedIn = Boolean(user);
  }

  return (
    <PageShell active="/rules" publicMode={!isSignedIn}>
      <main className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <SectionHeader
          eyebrow="Rules & Prizes"
          title={
            <>
              FIFA World Cup 2026 淘汰赛挑战赛
              <br />
              <span className="text-2xl md:text-3xl">游戏规则、积分与中奖说明</span>
            </>
          }
          body="世界杯不只是看球，更可以一起预测、一起冲榜、一起赢奖。本次活动由老招牌 Canton Kitchen 举办，共有3大游戏玩法、独立排行榜、独立奖品，并合并计算 Grand Prize 终极大奖。"
        />

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="游戏玩法" value="3 Games" tone="gold" />
          <StatCard label="个人赢家" value="20位" tone="green" />
          <StatCard label="团队赢家" value="3组" />
          <StatCard label="Grand Prize" value="1位" tone="navy" />
        </section>

        <section className="mt-6 overflow-hidden rounded-lg bg-[#071525] text-white">
          <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#f4c542]">
                Current Stage
              </p>
              <h2 className="mt-2 text-2xl font-black md:text-4xl">
                小组赛阶段
                <span className="block text-lg text-white/75 md:text-2xl">
                  Group Stage in Progress
                </span>
              </h2>
              <p className="mt-3 max-w-3xl font-semibold text-white/75">
                游戏1现在开放。游戏2将在32强名单确认后开放。游戏3现在可以先创建或加入团队，正式淘汰赛预测将在32强确认后开放。
              </p>
            </div>
            <Link
              href="/login?next=/game&mode=signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded bg-[#d71920] px-5 font-black text-white hover:bg-red-700"
            >
              Join the Game <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          {games.map((game) => {
            const Icon = game.icon;
            return (
              <article key={game.no} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex rounded bg-[#f4c542] px-3 py-1 text-xs font-black text-[#071525]">
                      {game.no}
                    </span>
                    <h2 className="mt-3 text-2xl font-black text-slate-950">
                      {game.cn}
                    </h2>
                    <p className="font-black text-[#d71920]">{game.en}</p>
                  </div>
                  <Icon className="shrink-0 text-[#0f8a4b]" size={30} />
                </div>
                <p className="mt-3 rounded bg-slate-100 p-3 text-sm font-black text-slate-700">
                  {game.status}
                </p>
                <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-600">
                  {game.intro}
                </p>
                <h3 className="mt-5 font-black text-slate-950">积分规则</h3>
                <div className="mt-3 grid gap-2">
                  {game.points.map(([label, points]) => (
                    <div
                      key={label}
                      className="grid grid-cols-[1fr_auto] gap-3 rounded bg-slate-100 p-3 text-sm"
                    >
                      <span className="font-bold text-slate-700">{label}</span>
                      <span className="font-black text-[#d71920]">{points}</span>
                    </div>
                  ))}
                </div>
                <h3 className="mt-5 font-black text-slate-950">玩法规则</h3>
                <ol className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
                  {game.rules.map((rule, index) => (
                    <li key={rule} className="flex gap-2">
                      <span className="text-[#0f8a4b]">{index + 1}.</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-5 rounded bg-[#071525] p-3 text-sm font-black text-white">
                  {game.prize}
                </p>
              </article>
            );
          })}
        </section>

        <section className="card mt-6 p-5">
          <div className="flex items-center gap-2">
            <UsersRound className="text-[#0f8a4b]" />
            <h2 className="text-xl font-black text-slate-950">
              团队模式补充规则
            </h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              "每个团队最多 5 人，包括 1 位队长和最多 4 位队友。",
              "如果同一个队长的邀请码有超过 5 人使用，系统会自动为该队长创建下一队。",
              "第 1 队满员后，新成员会自动加入第 2 队；第 2 队满员后，新成员会自动加入第 3 队。",
              "同一个队长可以拥有多个团队，但每个普通玩家只会加入一个团队。",
              "每个团队都会独立计算团队分数和团队排名。",
              "同一个队长可以拥有多个团队，但队长个人最终总分只会计算第 1 队的团队累计分。",
              "第 2 队、第 3 队等团队仍然会参加团队排行榜，但不会额外加进队长个人最终总分。",
              "普通成员只属于一个团队，因此普通成员的个人最终总分会计算自己所属团队的团队累计分。",
            ].map((rule) => (
              <p key={rule} className="rounded bg-slate-100 p-3 text-sm font-bold text-slate-700">
                {rule}
              </p>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <Medal className="text-[#f4c542]" />
              <h2 className="text-xl font-black text-slate-950">
                Grand Prize 终极大奖
              </h2>
            </div>
            <p className="mt-3 font-semibold leading-relaxed text-slate-600">
              除了3个游戏的独立奖品，本次活动还有一个最大终极大奖。Grand Prize 将颁给总积分最高的1位玩家。
            </p>
            <div className="mt-4 rounded bg-slate-100 p-4 font-black text-slate-950">
              玩家总积分 = 游戏1积分 + 游戏2积分 + 游戏3团队贡献积分
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              如果一个团队最终获得50分，该团队内每一位成员都会获得50分团队贡献积分，并加入个人 Grand Prize 总积分。
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <Gift className="text-[#d71920]" />
              <h2 className="text-xl font-black text-slate-950">
                奖品名额总结
              </h2>
            </div>
            <div className="mt-4 grid gap-3">
              {prizeSummary.map(([name, amount]) => (
                <div
                  key={name}
                  className="grid grid-cols-[1fr_auto] gap-3 rounded bg-slate-100 p-3"
                >
                  <span className="font-black text-slate-700">{name}</span>
                  <span className="font-black text-[#d71920]">{amount}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="text-[#0f8a4b]" />
              <h2 className="text-xl font-black text-slate-950">
                截止日期与比赛阶段
              </h2>
            </div>
            <div className="mt-4 grid gap-3">
              {stageDescriptions.map(([cn, en, description]) => (
                <div key={cn} className="rounded bg-slate-100 p-3">
                  <p className="font-black text-slate-950">{cn}</p>
                  <p className="text-sm font-bold text-[#d71920]">{en}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {description}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-600">
              所有预测都必须在指定截止日期前提交。预测一旦提交后，不能再修改答案。Once submitted, predictions cannot be changed.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-xl font-black text-slate-950">
              玩家参加流程
            </h2>
            <ol className="mt-4 grid gap-3">
              {playerFlow.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded bg-[#d71920] text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-sm font-semibold text-slate-700">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="card mt-6 p-5">
          <h2 className="text-xl font-black text-slate-950">重要提醒</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {reminders.map((item) => (
              <p key={item} className="rounded bg-slate-100 p-3 text-sm font-bold text-slate-700">
                {item}
              </p>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-lg bg-[#0f8a4b] p-5 text-white">
          <h2 className="text-2xl font-black">世界杯挑战开始，你敢不敢来预测？</h2>
          <p className="mt-2 max-w-3xl font-semibold text-white/85">
            先预测冠军走势，再挑战每场赢家。一个人可以冲榜，组队也可以赢奖。三大游戏积分合并，最高分玩家赢走 Grand Prize。
          </p>
        </section>
      </main>
    </PageShell>
  );
}
