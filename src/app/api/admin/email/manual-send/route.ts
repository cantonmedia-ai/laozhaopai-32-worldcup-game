import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

const bulkTypes = new Set([
  "verify_email",
  "welcome",
  "incomplete_prediction_3day",
  "incomplete_prediction_24hour",
  "incomplete_prediction_2hour",
  "new_round_open",
  "ranking_update",
  "winner",
]);

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;
  if (!hasSupabaseServiceEnv()) {
    return NextResponse.json({ error: "Supabase service key is not configured." }, { status: 500 });
  }

  const body = await request.json();
  const emailType = String(body.email_type || "");
  if (!bulkTypes.has(emailType)) {
    return NextResponse.json({ error: "Invalid email type." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("auth_user_id, email, display_name, nickname, email_verified, unsubscribed_from_email")
    .not("email", "is", null)
    .limit(Number(body.limit ?? 200));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const recipients = (profiles ?? []).filter((profile) => {
    if (profile.unsubscribed_from_email) return false;
    if (emailType !== "verify_email" && profile.email_verified === false) return false;
    return Boolean(profile.email);
  });

  const rows = recipients.map((profile) => ({
    user_id: profile.auth_user_id,
    recipient_email: profile.email,
    email_type: emailType,
    scheduled_for: new Date().toISOString(),
    payload: {
      display_name: profile.nickname || profile.display_name || "Player",
      round_name: body.round_name || "Sweet 16",
      game_title: "Brainwave Games",
      due_date: body.due_date || "28 Jun 2026, 11:59 pm",
      cta_url: body.cta_url || "/game",
    },
  }));

  if (rows.length) {
    const { error: insertError } = await supabase.from("email_queue").insert(rows);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, queued: rows.length });
}
