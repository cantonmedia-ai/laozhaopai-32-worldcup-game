import { NextResponse, type NextRequest } from "next/server";
import { getCountryByName } from "@/lib/champion-guess";
import { ensureChampionSettings, recalculateChampionWinners } from "@/lib/champion-admin";
import { requireAdminApi } from "@/lib/admin-api";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;

  try {
    const body = await request.json();
    const country = getCountryByName(String(body.official_champion_country ?? ""));
    const resultConfirmed = Boolean(body.result_confirmed);

    if (!country) {
      return NextResponse.json({ error: "Please select a valid champion country." }, { status: 400 });
    }

    const settings = await ensureChampionSettings();
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("game_settings")
      .update({
        official_champion_country: country.name,
        result_confirmed: resultConfirmed,
        result_confirmed_at: resultConfirmed ? new Date().toISOString() : null,
      })
      .eq("id", settings.id);

    if (error) throw error;

    const summary = await recalculateChampionWinners();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("admin_result_failed", error);
    return NextResponse.json({ error: "Unable to save result." }, { status: 500 });
  }
}
