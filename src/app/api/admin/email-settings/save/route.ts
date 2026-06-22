import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;
  if (!hasSupabaseServiceEnv()) {
    return NextResponse.json({ error: "Supabase service key is not configured." }, { status: 500 });
  }

  const body = await request.json();
  const supabase = createServiceClient();
  const payload = {
    sender_name: String(body.sender_name || "Brainwave Games"),
    sender_email: String(body.sender_email || "hello@brainwaveai.my"),
    reply_to_email: String(body.reply_to_email || "hello@brainwaveai.my"),
    test_recipient_email: body.test_recipient_email || null,
    automation_enabled: Boolean(body.automation_enabled),
    send_only_verified: body.send_only_verified !== false,
    send_only_incomplete: body.send_only_incomplete !== false,
    do_not_send_after_deadline: body.do_not_send_after_deadline !== false,
    do_not_duplicate_timing: body.do_not_duplicate_timing !== false,
    do_not_send_unsubscribed: body.do_not_send_unsubscribed !== false,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("email_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  const result = existing?.id
    ? await supabase.from("email_settings").update(payload).eq("id", existing.id).select().single()
    : await supabase.from("email_settings").insert(payload).select().single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, settings: result.data });
}
