import { NextResponse } from "next/server";
import { ensureChampionSettings } from "@/lib/champion-admin";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const settings = await ensureChampionSettings();
  const supabase = createServiceClient();

  const { data: winners, error } = await supabase
    .from("winners")
    .select("rank, is_winner, status, selected_country, players(name, created_at)")
    .order("rank", { ascending: true })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: "Unable to load result." }, { status: 500 });
  }

  return NextResponse.json({
    resultConfirmed: settings.result_confirmed,
    officialChampion: settings.official_champion_country,
    prizeLimit: settings.prize_limit,
    winners: winners ?? [],
  });
}
