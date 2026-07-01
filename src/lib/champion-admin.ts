import { createServiceClient } from "@/lib/supabase/service";
import { PRIZE_LIMIT } from "@/lib/champion-guess";

export type ChampionSettings = {
  id: string;
  game_name: string;
  prize_limit: number;
  submission_open: boolean;
  submission_close_at: string | null;
  official_champion_country: string | null;
  result_confirmed: boolean;
  result_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getChampionSettings() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("game_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as ChampionSettings | null;
}

export async function ensureChampionSettings() {
  const existing = await getChampionSettings();
  if (existing) return existing;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("game_settings")
    .insert({
      game_name: "Champion Guess 2026",
      prize_limit: PRIZE_LIMIT,
      submission_open: true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ChampionSettings;
}

export async function recalculateChampionWinners() {
  const supabase = createServiceClient();
  const settings = await ensureChampionSettings();

  if (!settings.official_champion_country) {
    return {
      officialChampion: null,
      correctGuessers: 0,
      winners: 0,
    };
  }

  const { error: deleteError } = await supabase
    .from("winners")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteError) throw deleteError;

  const prizeLimit = settings.prize_limit || PRIZE_LIMIT;
  const { data: correctPlayers, error: correctPlayersError } = await supabase
    .from("players")
    .select("id, selected_country, created_at")
    .eq("selected_country", settings.official_champion_country)
    .eq("is_disqualified", false)
    .order("created_at", { ascending: true });

  if (correctPlayersError) throw correctPlayersError;

  const selectedCorrectPlayerIds = new Set((correctPlayers ?? []).map((player) => player.id));
  const winnerCandidates = [...(correctPlayers ?? [])].slice(0, prizeLimit);

  if (winnerCandidates.length < prizeLimit) {
    const { data: replacementPlayers, error: replacementPlayersError } = await supabase
      .from("players")
      .select("id, selected_country, created_at")
      .eq("is_disqualified", false)
      .neq("selected_country", settings.official_champion_country)
      .order("created_at", { ascending: true })
      .limit(prizeLimit - winnerCandidates.length);

    if (replacementPlayersError) throw replacementPlayersError;
    winnerCandidates.push(...(replacementPlayers ?? []));
  }

  const rows = winnerCandidates.map((player, index) => ({
    player_id: player.id,
    selected_country: player.selected_country,
    rank: index + 1,
    is_winner: index + 1 <= prizeLimit,
    status: "pending_contact",
  }));

  if ((correctPlayers ?? []).length > prizeLimit) {
    rows.push(
      ...(correctPlayers ?? []).slice(prizeLimit).map((player, index) => ({
        player_id: player.id,
        selected_country: player.selected_country,
        rank: prizeLimit + index + 1,
        is_winner: false,
        status: "pending_contact",
      })),
    );
  }

  if (rows.length) {
    const { error: insertError } = await supabase.from("winners").insert(rows);
    if (insertError) throw insertError;
  }

  return {
    officialChampion: settings.official_champion_country,
    correctGuessers: selectedCorrectPlayerIds.size,
    winners: rows.filter((row) => row.is_winner).length,
  };
}
