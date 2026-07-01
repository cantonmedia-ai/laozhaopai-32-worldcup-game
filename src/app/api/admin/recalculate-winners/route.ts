import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { recalculateChampionWinners } from "@/lib/champion-admin";

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;

  try {
    const summary = await recalculateChampionWinners();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("admin_recalculate_winners_failed", error);
    return NextResponse.json({ error: "Unable to recalculate winners." }, { status: 500 });
  }
}
