import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;

  try {
    const body = await request.json();
    const winnerId = String(body.winnerId ?? "");
    const status = String(body.status ?? "");
    const adminNote = String(body.adminNote ?? "").trim() || null;

    if (!winnerId) {
      return NextResponse.json({ error: "Missing winner ID." }, { status: 400 });
    }

    const allowed = ["pending_contact", "contacted", "prize_collected", "disqualified", "replaced_manually"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid winner status." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("winners")
      .update({
        status,
        admin_note: adminNote,
        prize_collected_at: status === "prize_collected" ? new Date().toISOString() : null,
      })
      .eq("id", winnerId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin_winner_status_failed", error);
    return NextResponse.json({ error: "Unable to update winner." }, { status: 500 });
  }
}
