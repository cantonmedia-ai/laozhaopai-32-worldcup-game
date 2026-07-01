import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createServiceClient } from "@/lib/supabase/service";
import { recalculateChampionWinners } from "@/lib/champion-admin";

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;

  try {
    const body = await request.json();
    const playerId = String(body.playerId ?? "");
    const isDisqualified = Boolean(body.isDisqualified);
    const adminNote = String(body.adminNote ?? "").trim() || null;

    if (!playerId) {
      return NextResponse.json({ error: "Missing player ID." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("players")
      .update({ is_disqualified: isDisqualified, admin_note: adminNote })
      .eq("id", playerId);

    if (error) throw error;

    await recalculateChampionWinners();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin_disqualify_player_failed", error);
    return NextResponse.json({ error: "Unable to update player." }, { status: 500 });
  }
}
