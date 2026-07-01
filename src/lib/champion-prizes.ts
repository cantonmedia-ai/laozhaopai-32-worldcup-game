export type ChampionPrize = {
  tier: string;
  prize: string;
  quantity: number;
  value: number;
  rankStart: number;
  rankEnd: number;
  image?: string;
  imageFit?: "cover" | "contain";
};

export const CHAMPION_PRIZES: ChampionPrize[] = [
  {
    tier: "特等奖",
    prize: "老招牌广西鲍鱼盆菜 6人份",
    quantity: 2,
    value: 368,
    rankStart: 1,
    rankEnd: 2,
    image: "/assets/prizes/canton-abalone-poon-choi.png",
    imageFit: "contain",
  },
  {
    tier: "二等奖",
    prize: "Jera Studio 赞助明星肖像体验",
    quantity: 3,
    value: 298,
    rankStart: 3,
    rankEnd: 5,
    image: "/assets/prizes/jera-studio-package.png",
    imageFit: "cover",
  },
  {
    tier: "三等奖",
    prize: "TCWAY 赞助招牌马草鸡堂食礼券",
    quantity: 50,
    value: 135,
    rankStart: 6,
    rankEnd: 55,
    image: "/assets/prizes/tcway-chicken-voucher.png",
    imageFit: "contain",
  },
  {
    tier: "四等奖",
    prize: "燕遇美赞助现炖燕窝",
    quantity: 50,
    value: 38,
    rankStart: 56,
    rankEnd: 105,
    image: "/assets/prizes/yanyumei-birdnest.png",
    imageFit: "cover",
  },
  {
    tier: "五等奖",
    prize: "老招牌RM50现金礼券，最低消费 RM100",
    quantity: 30,
    value: 50,
    rankStart: 106,
    rankEnd: 135,
  },
  {
    tier: "六等奖",
    prize: "老招牌招牌亚三酱",
    quantity: 18,
    value: 18,
    rankStart: 136,
    rankEnd: 153,
  },
];

export const JERA_GALLERY_IMAGES = [
  "/assets/prizes/jera-portrait-orchid.png",
  "/assets/prizes/jera-portrait-butterfly.png",
];

export const TOTAL_PRIZE_VALUE = CHAMPION_PRIZES.reduce(
  (total, prize) => total + prize.quantity * prize.value,
  0,
);

export function prizeForRank(rank: number) {
  return CHAMPION_PRIZES.find((prize) => rank >= prize.rankStart && rank <= prize.rankEnd) ?? null;
}
