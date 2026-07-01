import Link from "next/link";
import type { ReactNode } from "react";
import { Gift, Medal, Trophy } from "lucide-react";
import { ChampionShell } from "@/components/champion-shell";
import { CHAMPION_PRIZES, TOTAL_PRIZE_VALUE, type ChampionPrize } from "@/lib/champion-prizes";

export default function PrizesPage() {
  const jeraPrize = CHAMPION_PRIZES.find((item) => item.prize.includes("Jera Studio"));
  const otherPrizes = CHAMPION_PRIZES.filter((item) => !item.prize.includes("Jera Studio"));

  return (
    <ChampionShell active="/prizes">
      <section className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f4c542]/50 bg-[#f4c542]/10 px-4 py-2 text-sm font-black text-[#f4c542]">
            <Trophy size={16} />
            世界杯冠军预测游戏奖品规则
          </div>
          <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">
            猜中冠军，越早参加，越有机会赢大奖！
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg md:leading-8">
            玩家只需选择一支国家队，预测 2026 FIFA 世界杯冠军，并填写姓名与联系方式，即可参与活动。
            官方冠军公布后，系统将根据玩家预测结果与参与时间，自动排序并分配奖品。
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f4c542] p-4 text-[#071525] md:p-5">
              <div className="text-sm font-black opacity-70">总奖品数量</div>
              <div className="mt-1 text-4xl font-black md:text-5xl">153份</div>
            </div>
            <div className="rounded-2xl bg-[#128c4a] p-4 text-white md:p-5">
              <div className="text-sm font-black opacity-70">总奖品价值</div>
              <div className="mt-1 text-4xl font-black md:text-5xl">
                RM{TOTAL_PRIZE_VALUE.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-100 px-4 py-8 text-[#071525]">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex items-center gap-2">
            <Gift className="text-[#d71920]" />
            <h2 className="text-3xl font-black">奖品列表</h2>
          </div>

          <div className="grid gap-4">
            {jeraPrize ? <JeraFeaturePrize item={jeraPrize} /> : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {otherPrizes.map((item) => (
                <PrizeCard key={item.tier} item={item} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-8 text-[#071525]">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-2xl bg-slate-50 p-5">
            <h2 className="text-3xl font-black">得奖分配方式</h2>
            <div className="mt-4 grid gap-3">
              {[
                "猜中冠军的玩家优先得奖。",
                "猜中冠军的玩家，将根据参与提交时间排序。",
                "越早参与的玩家，排名越前，优先获得较高价值奖品。",
                "如果猜中人数少过153人，剩余奖品将由其他参与者补上。",
                "替代获胜者同样根据参与提交时间排序，越早参与者优先得奖。",
                "奖品将依照排名顺序派发，直到153份奖品全部派完为止。",
              ].map((rule, index) => (
                <div key={rule} className="rounded-xl bg-white p-4 font-bold shadow-sm">
                  {index + 1}. {rule}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#071525] p-5 text-white">
            <h2 className="text-2xl font-black text-[#f4c542]">参加越早，机会越高</h2>
            <p className="mt-4 text-2xl font-black leading-9">
              猜中冠军，越早参加，越有机会赢大奖！
            </p>
            <p className="mt-4 leading-7 text-slate-300">
              猜中冠军者优先得奖，并按参与时间排名。如果猜中人数少过153名，剩余奖品将由所有参与者中，
              按参与时间最早者依次补上。总共153份奖品，送完为止！
            </p>
            <Link
              href="/join"
              className="mt-6 block rounded-xl bg-[#d71920] px-5 py-4 text-center text-lg font-black text-white"
            >
              立即参加
            </Link>
          </div>
        </div>
      </section>
    </ChampionShell>
  );
}

function JeraFeaturePrize({ item }: { item: ChampionPrize }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white p-3 shadow-xl shadow-slate-900/10 md:p-5">
      <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-black md:aspect-[16/7]">
        <img
          src="/assets/prizes/jera-studio-package.png"
          alt="Jera Studio portrait studio"
          className="h-full w-full object-cover object-top"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="overflow-hidden rounded-2xl bg-black">
          <img
            src="/assets/prizes/jera-portrait-orchid.png"
            alt="Jera Studio portrait with orchid"
            className="h-36 w-full object-cover md:h-56"
          />
        </div>
        <div className="overflow-hidden rounded-2xl bg-black">
          <img
            src="/assets/prizes/jera-portrait-butterfly.png"
            alt="Jera Studio portrait with butterfly"
            className="h-36 w-full object-cover md:h-56"
          />
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-1 shadow-sm">
        <div className="grid grid-cols-[82px_minmax(0,1fr)_82px] items-center gap-2 md:grid-cols-[160px_minmax(0,1fr)_140px] md:gap-3">
          <div className="rounded-2xl bg-[#f4c542] p-3 text-center text-[#071525] md:p-5">
            <div className="text-base font-black md:text-lg">二等奖</div>
            <div className="text-xs font-black uppercase tracking-wide">2nd Prize</div>
          </div>
          <h3 className="min-w-0 text-[19px] font-black leading-[1.15] md:text-4xl md:leading-tight">
            Jera Studio
            <br />
            赞助明星肖像体验
          </h3>
          <div className="rounded-2xl bg-[#f4c542] p-3 text-center text-xl font-black text-[#071525] md:p-5 md:text-4xl">
            RM298
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <InfoBox icon={<Gift size={28} />} label="数量" value="3份" />
        <InfoBox icon={<Medal size={28} />} label="排名" value="第3–5名" />
      </div>
    </article>
  );
}

function PrizeCard({ item }: { item: ChampionPrize }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-900/10">
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-[#f4c542] px-3 py-1 text-xs font-black text-[#071525]">
            {item.tier}
          </span>
          <span className="rounded-full bg-[#071525] px-3 py-1 text-xs font-black text-[#f4c542]">
            RM{item.value}
          </span>
        </div>
      </div>

      <div className="p-4">
        {item.image ? (
          <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-slate-50">
            <img
              src={item.image}
              alt={item.prize}
              className="h-full w-full object-cover object-center"
            />
          </div>
        ) : (
          <div className="grid h-40 place-items-center rounded-2xl bg-[#071525] p-5 text-center text-white md:h-48">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-[#f4c542]">
                Brainwave Games Prize
              </div>
              <div className="mt-2 text-2xl font-black">{item.tier}</div>
            </div>
          </div>
        )}

        <h3 className="mt-4 min-h-[3.25rem] overflow-hidden text-xl font-black leading-[1.3] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {item.prize}
        </h3>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <InfoBox label="数量" value={`${item.quantity}份`} />
          <InfoBox label="排名" value={`第${item.rankStart}–${item.rankEnd}名`} />
        </div>
      </div>
    </article>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      {icon ? <div className="mb-2 text-[#b58b24]">{icon}</div> : null}
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-black md:text-xl">{value}</div>
    </div>
  );
}
