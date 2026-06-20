export type Role = "player" | "admin";

export type RoundStatus =
  | "not_open"
  | "prediction_open"
  | "prediction_closed"
  | "results_revealed"
  | "completed";

export type MatchStatus =
  | "scheduled"
  | "prediction_open"
  | "prediction_closed"
  | "completed"
  | "cancelled";

export type Team = {
  id: string;
  name: string;
  shortName: string;
  flag: string;
  flagImage: string;
  seedNo: number;
  groupName: string;
};

export type GameRound = {
  id: string;
  name: string;
  labelCn: string;
  order: number;
  scoringPoints: number;
  status: RoundStatus;
  closesAt: string;
};

export type Match = {
  id: string;
  roundId: string;
  matchNo: number;
  teamAId: string;
  teamBId: string;
  teamAScore?: number;
  teamBScore?: number;
  winnerTeamId?: string;
  matchTime: string;
  predictionDeadline: string;
  status: MatchStatus;
};

export type Profile = {
  id: string;
  role: Role;
  displayName: string;
  phone?: string;
  avatarUrl?: string;
  referralCode: string;
  referredByProfileId?: string;
  favoriteTeam?: string;
  preferredOutlet?: string;
  acceptMarketing: boolean;
  profileCompleted: boolean;
  totalScore: number;
  rank: number;
  previousRank: number;
  correctPredictions: number;
  totalPredictions: number;
  createdAt: string;
};

export type Prediction = {
  id: string;
  profileId: string;
  roundId: string;
  matchId: string;
  predictedWinnerTeamId: string;
  predictedTeamAScore?: number;
  predictedTeamBScore?: number;
  scoreAwarded: number;
  isCorrect?: boolean;
};

export type Referral = {
  referrerProfileId: string;
  referredProfileId: string;
  referralCode: string;
  createdAt: string;
};

export type Reward = {
  id: string;
  rewardName: string;
  rankType: string;
  rankPosition?: number;
  claimStatus: "unclaimed" | "claimed" | "expired" | "cancelled";
  claimCode?: string;
};
