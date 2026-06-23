import type { SupabaseClient } from "@supabase/supabase-js";

export const game2Players = [
  "乌龙王",
  "神猜哥",
  "反向明灯",
  "绝杀佬",
  "加时王",
  "越位哥",
  "点球侠",
  "香蕉脚",
  "门柱之子",
  "玄学大师",
] as const;

export const game2TeamNames = ["乌龙王的第1队", "越位哥的第1队"] as const;

type AnyClient = SupabaseClient;

type ProfileRow = {
  id: string;
  auth_user_id: string;
  email: string | null;
};

type MatchRow = {
  id: string;
  round_key: string;
  match_number: number;
  team_a_id: string;
  team_b_id: string;
  actual_winner_team_id: string | null;
  team_a_score: number | null;
  team_b_score: number | null;
  status: string;
};

type TeamRow = {
  id: string;
  country_name: string | null;
  name: string;
};

const simCountries = [
  "Brazil",
  "Japan",
  "Argentina",
  "Mexico",
  "France",
  "Germany",
  "Spain",
  "Portugal",
  "Netherlands",
  "Colombia",
];

const simMatches = [
  ["last_32", 9001, "Brazil", "Japan", "Brazil", 2, 1],
  ["last_32", 9002, "Argentina", "Mexico", "Argentina", 1, 1],
  ["last_16", 9003, "France", "Germany", "France", 3, 1],
  ["last_8", 9004, "Spain", "Portugal", "Portugal", 0, 2],
  ["last_4", 9005, "Netherlands", "Colombia", "Netherlands", 2, 2],
  ["final", 9006, "Argentina", "France", "Argentina", 2, 0],
] as const;

const predictions = [
  [
    ["Brazil", 2, 1],
    ["Argentina", 1, 1],
    ["France", 2, 1],
    ["Portugal", 1, 2],
    ["Netherlands", 2, 2],
    ["Argentina", 2, 1],
  ],
  [
    ["Brazil", 2, 0],
    ["Mexico", 1, 1],
    ["France", 3, 1],
    ["Spain", 1, 0],
    ["Colombia", 2, 2],
    ["France", 1, 2],
  ],
  [
    ["Japan", 2, 1],
    ["Argentina", 2, 1],
    ["Germany", 1, 3],
    ["Portugal", 0, 2],
    ["Netherlands", 1, 1],
    ["Argentina", 3, 0],
  ],
  [
    ["Brazil", 3, 1],
    ["Argentina", 1, 1],
    ["France", 3, 0],
    ["Portugal", 0, 1],
    ["Netherlands", 2, 2],
    ["Argentina", 2, 0],
  ],
  [
    ["Brazil", 2, 1],
    ["Argentina", 0, 0],
    ["France", 3, 1],
    ["Portugal", 0, 2],
    ["Netherlands", 2, 1],
    ["Argentina", 2, 0],
  ],
  [
    ["Brazil", 1, 0],
    ["Argentina", 1, 1],
    ["Germany", 3, 1],
    ["Portugal", 0, 2],
    ["Colombia", 2, 2],
    ["Argentina", 2, 0],
  ],
  [
    ["Brazil", 2, 2],
    ["Argentina", 1, 1],
    ["France", 3, 2],
    ["Portugal", 1, 2],
    ["Netherlands", 2, 2],
    ["France", 2, 0],
  ],
  [
    ["Japan", 1, 2],
    ["Argentina", 2, 2],
    ["France", 3, 1],
    ["Spain", 0, 2],
    ["Netherlands", 3, 2],
    ["Argentina", 1, 0],
  ],
  [
    ["Brazil", 2, 1],
    ["Argentina", 1, 1],
    ["France", 3, 1],
    ["Portugal", 0, 2],
    ["Netherlands", 2, 2],
    ["Argentina", 2, 0],
  ],
  [
    ["Brazil", 2, 1],
    ["Argentina", 1, 1],
    ["France", 3, 1],
    ["Portugal", 0, 2],
    ["Netherlands", 2, 2],
    ["Argentina", 2, 0],
  ],
] as const;

function playerOrder(profile: ProfileRow) {
  const match = String(profile.email ?? "").match(/game2-sim-(\d+)@/);
  return match ? Number(match[1]) : 999;
}

function playerTeamName(order: number) {
  return order <= 5 ? game2TeamNames[0] : game2TeamNames[1];
}

async function ensureTeams(supabase: AnyClient) {
  const { data: existing, error } = await supabase
    .from("teams")
    .select("id, country_name, name")
    .in("country_name", simCountries);
  if (error) throw error;

  const byName = new Map<string, TeamRow>();
  for (const team of (existing ?? []) as TeamRow[]) {
    byName.set(team.country_name ?? team.name, team);
  }

  const missing = simCountries.filter((name) => !byName.has(name));
  if (missing.length) {
    const { data, error: insertError } = await supabase
      .from("teams")
      .insert(
        missing.map((name) => ({
          name,
          short_name: name.slice(0, 3).toUpperCase(),
          country_name: name,
          country_code: name.slice(0, 3).toUpperCase(),
          is_active: true,
          is_simulation: true,
        })),
      )
      .select("id, country_name, name");
    if (insertError) throw insertError;
    for (const team of (data ?? []) as TeamRow[]) {
      byName.set(team.country_name ?? team.name, team);
    }
  }

  return byName;
}

export async function clearGame2Simulation(supabase: AnyClient) {
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, auth_user_id")
    .like("email", "game2-sim-%@brainwave.local");
  const profileIds = (profileRows ?? []).map((row) => row.id);
  const userIds = (profileRows ?? []).map((row) => row.auth_user_id);

  const { data: matchRows } = await supabase
    .from("knockout_matches")
    .select("id")
    .eq("is_simulation", true);
  const matchIds = (matchRows ?? []).map((row) => row.id);

  const { data: gameTeams } = await supabase
    .from("game_teams")
    .select("id")
    .eq("is_simulation", true);
  const gameTeamIds = (gameTeams ?? []).map((row) => row.id);

  if (matchIds.length) {
    await supabase.from("point_transactions").delete().in("match_id", matchIds);
    await supabase.from("team_match_predictions").delete().in("match_id", matchIds);
    await supabase.from("solo_match_predictions").delete().in("match_id", matchIds);
    await supabase.from("knockout_matches").delete().in("id", matchIds);
  }

  if (gameTeamIds.length) {
    await supabase.from("team_score_summary").delete().in("team_id", gameTeamIds);
    await supabase.from("game_team_members").delete().in("team_id", gameTeamIds);
    await supabase.from("game_teams").delete().in("id", gameTeamIds);
  }

  if (profileIds.length) {
    await supabase.from("player_score_summaries").delete().in("profile_id", profileIds);
    await supabase.from("profiles").delete().in("id", profileIds);
  }

  for (const userId of userIds) {
    await supabase.auth.admin.deleteUser(userId);
  }

  return { ok: true, message: "Game 2 simulation data cleared." };
}

export async function runGame2Simulation(supabase: AnyClient) {
  await clearGame2Simulation(supabase);
  const teamByName = await ensureTeams(supabase);

  const createdProfiles: ProfileRow[] = [];
  for (let i = 0; i < game2Players.length; i += 1) {
    const order = i + 1;
    const user = await supabase.auth.admin.createUser({
      email: `game2-sim-${order}@brainwave.local`,
      password: "simulation-password",
      email_confirm: true,
      user_metadata: { display_name: game2Players[i] },
    });
    if (user.error) throw user.error;
    const authUserId = user.data.user.id;
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        auth_user_id: authUserId,
        user_id: authUserId,
        role: "player",
        display_name: `模拟-${game2Players[i]}`,
        nickname: game2Players[i],
        email: `game2-sim-${order}@brainwave.local`,
        referral_code: `G2SIM${String(order).padStart(5, "0")}`,
        profile_completed: true,
        email_verified: true,
        is_simulation: true,
      })
      .select("id, auth_user_id, email")
      .single();
    if (error) throw error;
    createdProfiles.push(data as ProfileRow);
  }

  const gameTeamIds: string[] = [];
  for (let teamIndex = 0; teamIndex < 2; teamIndex += 1) {
    const captain = createdProfiles[teamIndex === 0 ? 0 : 5];
    const { data, error } = await supabase
      .from("game_teams")
      .insert({
        team_name: game2TeamNames[teamIndex],
        team_code: `G2SIMTEAM${teamIndex + 1}`,
        created_by_user_id: captain.auth_user_id,
        max_members: 5,
        status: "active",
        is_simulation: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    gameTeamIds.push(data.id);

    const start = teamIndex === 0 ? 0 : 5;
    const members = createdProfiles.slice(start, start + 5);
    const { error: memberError } = await supabase.from("game_team_members").insert(
      members.map((profile, memberIndex) => ({
        team_id: data.id,
        user_id: profile.auth_user_id,
        role: memberIndex === 0 ? "captain" : "member",
        status: "active",
        joined_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        is_simulation: true,
      })),
    );
    if (memberError) throw memberError;
  }

  const previousRounds = await supabase
    .from("knockout_rounds")
    .select("round_key, status")
    .in("round_key", [...new Set(simMatches.map((match) => match[0]))]);

  const matchRows: MatchRow[] = [];
  for (const [roundKey, matchNumber, teamA, teamB] of simMatches) {
    const teamAId = teamByName.get(teamA)?.id;
    const teamBId = teamByName.get(teamB)?.id;
    if (!teamAId || !teamBId) throw new Error(`Missing simulation team for ${teamA} vs ${teamB}.`);
    const kickoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("knockout_matches")
      .insert({
        round_key: roundKey,
        match_number: matchNumber,
        team_a_id: teamAId,
        team_b_id: teamBId,
        match_start_at: kickoff,
        prediction_lock_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        status: "open",
        is_simulation: true,
      })
      .select("id, round_key, match_number, team_a_id, team_b_id, actual_winner_team_id, team_a_score, team_b_score, status")
      .single();
    if (error) throw error;
    matchRows.push(data as MatchRow);
  }

  const soloRows = [];
  const teamRows = [];
  for (let playerIndex = 0; playerIndex < createdProfiles.length; playerIndex += 1) {
    const profile = createdProfiles[playerIndex];
    const teamId = playerIndex < 5 ? gameTeamIds[0] : gameTeamIds[1];
    for (let matchIndex = 0; matchIndex < matchRows.length; matchIndex += 1) {
      const match = matchRows[matchIndex];
      const [winner, teamAScore, teamBScore] = predictions[playerIndex][matchIndex];
      const winnerTeamId = teamByName.get(winner)?.id;
      if (!winnerTeamId) throw new Error(`Missing winner team ${winner}.`);
      const row = {
        user_id: profile.auth_user_id,
        match_id: match.id,
        selected_winner_team_id: winnerTeamId,
        predicted_team_a_score: teamAScore,
        predicted_team_b_score: teamBScore,
        status: "submitted",
        is_simulation: true,
      };
      soloRows.push(row);
      teamRows.push({ ...row, team_id: teamId });
    }
  }

  const soloInsert = await supabase.from("solo_match_predictions").insert(soloRows);
  if (soloInsert.error) throw soloInsert.error;
  const teamInsert = await supabase.from("team_match_predictions").insert(teamRows);
  if (teamInsert.error) throw teamInsert.error;

  for (let i = 0; i < simMatches.length; i += 1) {
    const [, , , , officialWinner, teamAScore, teamBScore] = simMatches[i];
    const rpc = await supabase.rpc("admin_confirm_knockout_match_result", {
      p_match_id: matchRows[i].id,
      p_actual_winner_team_id: teamByName.get(officialWinner)?.id,
      p_team_a_score: teamAScore,
      p_team_b_score: teamBScore,
    });
    if (rpc.error) throw rpc.error;
  }

  if (previousRounds.data?.length) {
    for (const round of previousRounds.data) {
      await supabase
        .from("knockout_rounds")
        .update({ status: round.status })
        .eq("round_key", round.round_key);
    }
  }

  await supabase
    .from("point_transactions")
    .update({ is_simulation: true })
    .in("match_id", matchRows.map((match) => match.id));

  return getGame2Simulation(supabase);
}

export async function getGame2Simulation(supabase: AnyClient) {
  const profiles = await supabase
    .from("profiles")
    .select("id, auth_user_id, email")
    .like("email", "game2-sim-%@brainwave.local");
  if (profiles.error) throw profiles.error;
  const profileRows = ((profiles.data ?? []) as ProfileRow[]).sort(
    (a, b) => playerOrder(a) - playerOrder(b),
  );
  const userIds = profileRows.map((profile) => profile.auth_user_id);

  const [matchesRes, predsRes, membersRes, teamsRes] = await Promise.all([
    supabase
      .from("knockout_matches")
      .select("id, round_key, match_number, team_a_id, team_b_id, actual_winner_team_id, team_a_score, team_b_score, status")
      .eq("is_simulation", true)
      .order("match_number"),
    supabase
      .from("solo_match_predictions")
      .select("user_id, match_id, selected_winner_team_id, predicted_team_a_score, predicted_team_b_score, individual_match_score, team_accumulated_score, final_earned_score, is_correct, status")
      .eq("is_simulation", true),
    supabase
      .from("game_team_members")
      .select("team_id, user_id")
      .eq("is_simulation", true),
    supabase.from("teams").select("id, country_name, name"),
  ]);
  const error = matchesRes.error ?? predsRes.error ?? membersRes.error ?? teamsRes.error;
  if (error) throw error;

  const matchRows = (matchesRes.data ?? []) as MatchRow[];
  const predRows = (predsRes.data ?? []) as Array<Record<string, any>>;
  const memberRows = (membersRes.data ?? []) as Array<{ team_id: string; user_id: string }>;
  const teamRowsLookup = (teamsRes.data ?? []) as TeamRow[];
  const countryById = new Map(teamRowsLookup.map((team) => [team.id, team.country_name ?? team.name]));
  const profileByUser = new Map(profileRows.map((profile) => [profile.auth_user_id, profile]));
  const memberByUser = new Map(memberRows.map((member) => [member.user_id, member.team_id]));

  const matchById = new Map(matchRows.map((match) => [match.id, match]));
  const matchResults = predRows
    .filter((row) => userIds.includes(row.user_id))
    .map((row) => {
      const profile = profileByUser.get(row.user_id)!;
      const order = playerOrder(profile);
      const match = matchById.get(row.match_id)!;
      const winnerPoints = Number(row.is_correct ? row.individual_match_score : row.individual_match_score) -
        (Number(row.predicted_team_a_score) === Number(match.team_a_score) &&
        Number(row.predicted_team_b_score) === Number(match.team_b_score)
          ? 3
          : Number(row.predicted_team_a_score) === Number(match.team_a_score) ||
              Number(row.predicted_team_b_score) === Number(match.team_b_score)
            ? 1
            : 0);
      const scoreAccuracy =
        Number(row.predicted_team_a_score) === Number(match.team_a_score) &&
        Number(row.predicted_team_b_score) === Number(match.team_b_score)
          ? 3
          : Number(row.predicted_team_a_score) === Number(match.team_a_score) ||
              Number(row.predicted_team_b_score) === Number(match.team_b_score)
            ? 1
            : 0;
      return {
        player_name: game2Players[order - 1] ?? `模拟玩家 ${order}`,
        team_name: playerTeamName(order),
        match_label: `${countryById.get(match.team_a_id)} vs ${countryById.get(match.team_b_id)}`,
        round_key: match.round_key,
        official_winner: countryById.get(match.actual_winner_team_id ?? "") ?? "-",
        official_score: `${match.team_a_score} - ${match.team_b_score}`,
        predicted_winner: countryById.get(row.selected_winner_team_id) ?? "-",
        predicted_score: `${row.predicted_team_a_score} - ${row.predicted_team_b_score}`,
        winner_points: winnerPoints,
        score_accuracy_points: scoreAccuracy,
        individual_match_score: Number(row.individual_match_score ?? 0),
        team_match_accumulated_score: Number(row.team_accumulated_score ?? 0),
        match_final_earned_score: Number(row.final_earned_score ?? 0),
        sort_order: order,
        match_number: match.match_number,
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order || a.match_number - b.match_number);

  const playerSummary = profileRows.map((profile) => {
    const order = playerOrder(profile);
    const rows = matchResults.filter((row) => row.sort_order === order);
    return {
      player_name: game2Players[order - 1] ?? `模拟玩家 ${order}`,
      team_name: playerTeamName(order),
      game2_individual_total_score: rows.reduce((sum, row) => sum + row.individual_match_score, 0),
      game2_team_accumulated_total_score: rows.reduce(
        (sum, row) => sum + row.team_match_accumulated_score,
        0,
      ),
      game2_final_earned_total_score:
        rows.reduce((sum, row) => sum + row.individual_match_score, 0) +
        rows.reduce((sum, row) => sum + row.team_match_accumulated_score, 0),
      sort_order: order,
    };
  });

  const teamSummary = [1, 2].map((teamNo) => {
    const min = teamNo === 1 ? 1 : 6;
    const max = teamNo === 1 ? 5 : 10;
    const players = playerSummary.filter((row) => row.sort_order >= min && row.sort_order <= max);
    return {
      team_name: game2TeamNames[teamNo - 1],
      member_count: players.length,
      members: players.map((row) => row.player_name),
      game2_team_accumulated_score: players.reduce(
        (sum, row) => sum + row.game2_individual_total_score,
        0,
      ),
    };
  });

  return {
    ok: true,
    message: "游戏二模拟测试完成。分数已由真实游戏二计分逻辑自动生成。",
    validation: {
      player_count: profileRows.length,
      team_count: new Set(memberRows.map((row) => row.team_id)).size,
      bad_team_count: teamSummary.filter((team) => team.member_count !== 5).length,
      match_count: matchRows.length,
      missing_prediction_count: Math.max(0, profileRows.length * 6 - predRows.length),
      official_result_count: matchRows.filter((match) => match.actual_winner_team_id).length,
    },
    match_results: matchResults,
    player_summary: playerSummary,
    team_summary: teamSummary,
    raw: {
      official_match_results: matchRows.map((match) => ({
        match: `${countryById.get(match.team_a_id)} vs ${countryById.get(match.team_b_id)}`,
        round_key: match.round_key,
        winner: countryById.get(match.actual_winner_team_id ?? "") ?? "-",
        score: `${match.team_a_score} - ${match.team_b_score}`,
      })),
      player_predictions: matchResults,
      team_members: teamSummary,
      calculated_json: matchResults,
      member_team_ids: Object.fromEntries(
        profileRows.map((profile) => [
          game2Players[playerOrder(profile) - 1],
          memberByUser.get(profile.auth_user_id),
        ]),
      ),
    },
  };
}
