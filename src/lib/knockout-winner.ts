export const knockoutWinnerNameCn = "淘汰赛赢家战";
export const knockoutWinnerNameEn = "Knockout Winner Challenge";
export const knockoutWinnerTitle = `${knockoutWinnerNameCn}\n${knockoutWinnerNameEn}`;
export const knockoutWinnerSubtitle = "预测每一轮淘汰赛赢家，个人积分冲排行榜。";
export const knockoutWinnerDescription =
  "从 32强生死战 / Round of 32 开始，预测每一场淘汰赛的赢家。猜中越多，积分越高，排行榜越前，赢奖机会越大。";
export const knockoutWinnerCta = "参加个人赢家战";
export const knockoutWinnerRankingTitle =
  "淘汰赛赢家战排行榜\nKnockout Winner Challenge Ranking";
export const knockoutWinnerAdminTitle =
  "淘汰赛赢家战管理\nKnockout Winner Challenge Admin Control";

export const knockoutRoundPoints: Record<string, number> = {
  last_32: 1,
  last_16: 2,
  last_8: 4,
  last_4: 6,
  final: 10,
};

export function matchStatusLabel(
  status: string,
  predictionDeadline: string,
  scored?: boolean,
) {
  if (scored || status === "completed") return "Scored";
  if (new Date(predictionDeadline).getTime() <= Date.now()) return "Locked";
  if (status === "prediction_closed") return "Locked";
  return "Open";
}

export function countdownLabel(value: string, now = Date.now()) {
  const diff = new Date(value).getTime() - now;
  if (diff <= 0) return "Closed";

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);

  if (days > 0) return `${days} days ${hours} hours`;
  if (hours > 0) return `${hours} hours ${minutes} min`;
  return `${minutes} min`;
}
