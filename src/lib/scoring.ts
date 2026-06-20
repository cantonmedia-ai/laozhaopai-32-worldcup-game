import type { GameRound, Match, Prediction, Profile } from "@/types/game";

export const roundPoints: Record<string, number> = {
  r32: 10,
  r16: 15,
  qf: 20,
  sf: 25,
  final: 40,
};

export const exactOneTeamScoreBonus = 5;
export const exactBothTeamsScoreBonus = 15;

export function calculatePredictionScore(
  prediction: Prediction,
  match: Match,
  round: GameRound,
) {
  const isCorrect = Boolean(
    match.winnerTeamId &&
      prediction.predictedWinnerTeamId === match.winnerTeamId,
  );
  const teamAExact =
    typeof match.teamAScore === "number" &&
    prediction.predictedTeamAScore === match.teamAScore;
  const teamBExact =
    typeof match.teamBScore === "number" &&
    prediction.predictedTeamBScore === match.teamBScore;
  const exactScoreBonus =
    teamAExact && teamBExact
      ? exactBothTeamsScoreBonus
      : teamAExact || teamBExact
        ? exactOneTeamScoreBonus
        : 0;
  const winnerPoints = isCorrect ? round.scoringPoints : 0;

  return {
    isCorrect,
    teamAExact,
    teamBExact,
    winnerPoints,
    exactScoreBonus,
    scoreAwarded: winnerPoints + exactScoreBonus,
  };
}

export function rankProfiles(players: Profile[]) {
  return [...players]
    .sort((a, b) => {
      const accuracyA = a.totalPredictions
        ? a.correctPredictions / a.totalPredictions
        : 0;
      const accuracyB = b.totalPredictions
        ? b.correctPredictions / b.totalPredictions
        : 0;

      return (
        b.totalScore - a.totalScore ||
        accuracyB - accuracyA ||
        b.correctPredictions - a.correctPredictions ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    })
    .map((player, index) => ({
      ...player,
      previousRank: player.rank,
      rank: index + 1,
    }));
}

export function rankingMovement(profile: Profile) {
  const movement = profile.previousRank - profile.rank;
  if (movement > 0) return `上升 ${movement} 位`;
  if (movement < 0) return `下降 ${Math.abs(movement)} 位`;
  return "排名稳定";
}

export function accuracy(profile: Profile) {
  if (!profile.totalPredictions) return 0;
  return Math.round((profile.correctPredictions / profile.totalPredictions) * 100);
}
