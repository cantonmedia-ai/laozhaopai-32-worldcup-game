import Link from "next/link";
import { Gift, Trophy } from "lucide-react";
import { ChampionShell } from "@/components/champion-shell";
import { CHAMPION_PRIZES, JERA_GALLERY_IMAGES, TOTAL_PRIZE_VALUE } from "@/lib/champion-prizes";

export default function PrizesPage() {
  return (
    <ChampionShell active="/prizes">
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 md:grid-cols-[minmax(0,1fr)_420px] md:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f4c542]/50 bg-[#f4c542]/10 px-4 py-2 text-sm font-black text-[#f4c542]">
              <Trophy size={16} />
              世界杯冠军预测游戏奖品规则
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">
              猜中冠军，越早参加，越有机会赢大奖！
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
              玩家只需选择一支国家队，预测 2026 FIFA 世界杯冠军，并填写姓名与联系方式，即可参与活动。
              官方冠军公布后，系统将根据玩家预测结果与参与时间，自动排序并分配奖品。
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f4c542] p-5 text-[#071525]">
                <div className="text-sm font-black opacity-70">总奖品数量</div>
                <div className="mt-2 text-5xl font-black">153份</div>
              </div>
              <div className="rounded-2xl bg-[#128c4a] p-5 text-white">
                <div className="text-sm font-black opacity-70">总奖品价值</div>
                <div className="mt-2 text-5xl font-black">RM{TOTAL_PRIZE_VALUE.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="overflow-hidden rounded-2xl bg-white p-3">
              <img
                src="/assets/prizes/canton-abalone-poon-choi.png"
                alt="老招牌广西鲍鱼盆菜 6人份"
                className="h-56 w-full object-contain md:h-72"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="overflow-hidden rounded-2xl bg-black">
                <img
                  src="/assets/prizes/jera-portrait-orchid.png"
                  alt="Jera Studio 明星肖像体验"
                  className="h-36 w-full object-cover md:h-44"
                />
              </div>
              <div className="overflow-hidden rounded-2xl bg-white">
                <img
                  src="/assets/prizes/yanyumei-birdnest.png"
                  alt="燕遇美赞助现炖燕窝"
                  className="h-36 w-full object-cover md:h-44"
                />
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CHAMPION_PRIZES.map((item) => (
              <article
                key={item.tier}
                className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-900/10"
              >
                {item.image ? (
                  <div className="grid h-56 place-items-center bg-slate-50 p-3">
                    <img
                      src={item.image}
                      alt={item.prize}
                      className={`h-full w-full ${
                        item.imageFit === "contain" ? "object-contain" : "object-cover"
                      }`}
                    />
                  </div>
                ) : (
                  <div className="grid h-56 place-items-center bg-[#071525] p-6 text-center text-white">
                    <div>
                      <div className="text-sm font-black uppercase tracking-[0.22em] text-[#f4c542]">
                        Brainwave Games Prize
                      </div>
                      <div className="mt-3 text-3xl font-black">{item.tier}</div>
                    </div>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-[#d71920]">{item.tier}</div>
                      <h3 className="mt-1 text-xl font-black leading-tight">{item.prize}</h3>
                    </div>
                    <div className="rounded-full bg-[#f4c542] px-3 py-1 text-sm font-black text-[#071525]">
                      RM{item.value}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="font-bold text-slate-500">数量</div>
                      <div className="text-lg font-black">{item.quantity}份</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="font-bold text-slate-500">排名</div>
                      <div className="text-lg font-black">
                        第{item.rankStart}–{item.rankEnd}名
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
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

          <div className="grid gap-4">
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

            <div className="grid grid-cols-2 gap-3">
              {JERA_GALLERY_IMAGES.map((image, index) => (
                <div key={image} className="overflow-hidden rounded-2xl bg-black">
                  <img
                    src={image}
                    alt={`Jera Studio 肖像作品 ${index + 1}`}
                    className="h-52 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </ChampionShell>
  );
}
