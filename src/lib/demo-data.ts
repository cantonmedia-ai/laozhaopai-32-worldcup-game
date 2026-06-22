import type {
  GameRound,
  Match,
  Prediction,
  Profile,
  Referral,
  Reward,
  Team,
} from "@/types/game";
import { rankProfiles } from "./scoring";

export const game = {
  id: "game-worldcup-2026",
  name: "老招牌 32强冠军竞猜赛",
  slug: "laozhaopai-32",
  status: "active",
};

export const teams: Team[] = [
  ["arg", "阿根廷", "ARG", "🇦🇷", "A", 1],
  ["fra", "法国", "FRA", "🇫🇷", "A", 2],
  ["bra", "巴西", "BRA", "🇧🇷", "B", 3],
  ["eng", "英格兰", "ENG", "🏴", "B", 4],
  ["esp", "西班牙", "ESP", "🇪🇸", "C", 5],
  ["ger", "德国", "GER", "🇩🇪", "C", 6],
  ["por", "葡萄牙", "POR", "🇵🇹", "D", 7],
  ["ned", "荷兰", "NED", "🇳🇱", "D", 8],
  ["jpn", "日本", "JPN", "🇯🇵", "E", 9],
  ["kor", "韩国", "KOR", "🇰🇷", "E", 10],
  ["usa", "美国", "USA", "🇺🇸", "F", 11],
  ["mex", "墨西哥", "MEX", "🇲🇽", "F", 12],
  ["ita", "意大利", "ITA", "🇮🇹", "G", 13],
  ["cro", "克罗地亚", "CRO", "🇭🇷", "G", 14],
  ["mar", "摩洛哥", "MAR", "🇲🇦", "H", 15],
  ["aus", "澳洲", "AUS", "🇦🇺", "H", 16],
].map(([id, name, shortName, flag, groupName, seedNo]) => ({
  id: String(id),
  name: String(name),
  shortName: String(shortName),
  flag: String(flag),
  flagImage: `/assets/flags/${id}.png`,
  groupName: String(groupName),
  seedNo: Number(seedNo),
}));

export const rounds: GameRound[] = [
  {
    id: "r32",
    name: "Round of 32",
    labelCn: "32强",
    order: 1,
    scoringPoints: 5,
    status: "prediction_open",
    closesAt: "2026-07-01T12:00:00+08:00",
  },
  {
    id: "r16",
    name: "Sweet 16",
    labelCn: "16强",
    order: 2,
    scoringPoints: 8,
    status: "not_open",
    closesAt: "2026-07-06T12:00:00+08:00",
  },
  {
    id: "qf",
    name: "Elite 8",
    labelCn: "8强",
    order: 3,
    scoringPoints: 12,
    status: "not_open",
    closesAt: "2026-07-10T12:00:00+08:00",
  },
  {
    id: "sf",
    name: "Final 4",
    labelCn: "4强",
    order: 4,
    scoringPoints: 18,
    status: "not_open",
    closesAt: "2026-07-14T12:00:00+08:00",
  },
  {
    id: "final",
    name: "Grand Final",
    labelCn: "决赛",
    order: 5,
    scoringPoints: 30,
    status: "not_open",
    closesAt: "2026-07-18T12:00:00+08:00",
  },
];

export const matches: Match[] = [
  ["m1", 1, "arg", "aus"],
  ["m2", 2, "fra", "kor"],
  ["m3", 3, "bra", "mex"],
  ["m4", 4, "eng", "usa"],
  ["m5", 5, "esp", "mar"],
  ["m6", 6, "ger", "jpn"],
  ["m7", 7, "por", "cro"],
  ["m8", 8, "ned", "ita"],
].map(([id, matchNo, teamAId, teamBId], index) => ({
  id: String(id),
  roundId: "r32",
  matchNo: Number(matchNo),
  teamAId: String(teamAId),
  teamBId: String(teamBId),
  matchTime: `2026-07-${String(index + 2).padStart(2, "0")}T20:00:00+08:00`,
  predictionDeadline: "2026-07-01T12:00:00+08:00",
  status: "prediction_open",
}));

export const profiles: Profile[] = rankProfiles([
  {
    id: "me",
    role: "player",
    displayName: "招牌神射手",
    phone: "0123456789",
    avatarUrl: "",
    referralCode: "LZP2026",
    favoriteTeam: "阿根廷",
    preferredOutlet: "Canton Kitchen",
    acceptMarketing: true,
    profileCompleted: true,
    totalScore: 65,
    rank: 6,
    previousRank: 8,
    correctPredictions: 5,
    totalPredictions: 8,
    createdAt: "2026-06-01T08:00:00+08:00",
  },
  {
    id: "p2",
    role: "player",
    displayName: "冠军预言家",
    referralCode: "LZP1001",
    acceptMarketing: true,
    profileCompleted: true,
    totalScore: 90,
    rank: 1,
    previousRank: 2,
    correctPredictions: 7,
    totalPredictions: 8,
    createdAt: "2026-05-30T08:00:00+08:00",
  },
  {
    id: "p3",
    role: "player",
    displayName: "足球饭王",
    referralCode: "LZP1002",
    acceptMarketing: false,
    profileCompleted: true,
    totalScore: 80,
    rank: 2,
    previousRank: 1,
    correctPredictions: 6,
    totalPredictions: 8,
    createdAt: "2026-05-31T08:00:00+08:00",
  },
  {
    id: "p4",
    role: "player",
    displayName: "半夜看球",
    referralCode: "LZP1003",
    acceptMarketing: true,
    profileCompleted: true,
    totalScore: 70,
    rank: 3,
    previousRank: 5,
    correctPredictions: 5,
    totalPredictions: 8,
    createdAt: "2026-06-02T08:00:00+08:00",
  },
  {
    id: "admin",
    role: "admin",
    displayName: "Admin",
    referralCode: "ADMIN",
    acceptMarketing: false,
    profileCompleted: true,
    totalScore: 0,
    rank: 99,
    previousRank: 99,
    correctPredictions: 0,
    totalPredictions: 0,
    createdAt: "2026-05-01T08:00:00+08:00",
  },
]);

export const predictions: Prediction[] = [
  { id: "pr1", profileId: "me", roundId: "r32", matchId: "m1", predictedWinnerTeamId: "arg", predictedTeamAScore: 2, predictedTeamBScore: 1, scoreAwarded: 5, isCorrect: true },
  { id: "pr2", profileId: "me", roundId: "r32", matchId: "m2", predictedWinnerTeamId: "fra", predictedTeamAScore: 3, predictedTeamBScore: 0, scoreAwarded: 5, isCorrect: true },
  { id: "pr3", profileId: "me", roundId: "r32", matchId: "m3", predictedWinnerTeamId: "bra", predictedTeamAScore: 1, predictedTeamBScore: 0, scoreAwarded: 5, isCorrect: true },
];

export const referrals: Referral[] = [
  { referrerProfileId: "me", referredProfileId: "p3", referralCode: "LZP2026", createdAt: "2026-06-10T08:00:00+08:00" },
  { referrerProfileId: "me", referredProfileId: "p4", referralCode: "LZP2026", createdAt: "2026-06-11T08:00:00+08:00" },
];

export const rewards: Reward[] = [
  { id: "rw1", rewardName: "限定周边大礼包 + Voucher", rankType: "总榜", rankPosition: 1, claimStatus: "unclaimed", claimCode: "LZP-GOLD" },
  { id: "rw2", rewardName: "老招牌周边礼包", rankType: "总榜", rankPosition: 2, claimStatus: "unclaimed" },
  { id: "rw3", rewardName: "马克杯 / T-shirt", rankType: "总榜", rankPosition: 3, claimStatus: "unclaimed" },
  { id: "rw4", rewardName: "电子优惠券", rankType: "第4-10名", claimStatus: "unclaimed" },
  { id: "rw5", rewardName: "人气邀请王特别周边奖", rankType: "人气榜", rankPosition: 1, claimStatus: "unclaimed" },
];

export function getTeam(teamId: string) {
  return teams.find((team) => team.id === teamId)!;
}

export function getCurrentRound() {
  return rounds.find((round) => round.status === "prediction_open") ?? rounds[0];
}

export function getCurrentMatches() {
  const currentRound = getCurrentRound();
  return matches.filter((match) => match.roundId === currentRound.id);
}

export function getMe() {
  return profiles.find((profile) => profile.id === "me")!;
}
