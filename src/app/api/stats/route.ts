import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = createServiceClient();
  const { count } = await supabase.from("players").select("id", { count: "exact", head: true });
  const { data: countryRows, error: countryError } = await supabase
    .from("players")
    .select("selected_country, selected_country_code")
    .eq("is_disqualified", false);
  const { data: recentRows, error: recentError } = await supabase
    .from("players")
    .select("id, name, selected_country, selected_country_code, created_at")
    .eq("is_disqualified", false)
    .order("created_at", { ascending: false })
    .limit(10);

  if (countryError || recentError) {
    return NextResponse.json({ error: "Unable to load stats." }, { status: 500 });
  }

  const countryStats = Object.values(
    (countryRows ?? []).reduce<Record<string, { country: string; code: string | null; count: number }>>(
      (stats, row) => {
        const key = row.selected_country;
        stats[key] = stats[key] ?? {
          country: row.selected_country,
          code: row.selected_country_code,
          count: 0,
        };
        stats[key].count += 1;
        return stats;
      },
      {},
    ),
  ).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    totalPlayers: count ?? 0,
    countryStats,
    recentPlayers: recentRows ?? [],
  });
}
