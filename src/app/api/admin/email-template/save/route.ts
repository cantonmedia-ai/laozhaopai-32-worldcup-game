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
  const type = String(body.type || "");
  if (!type) return NextResponse.json({ error: "Email type is required." }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("email_templates")
    .upsert(
      {
        type,
        subject: String(body.subject || ""),
        preview_text: body.preview_text || null,
        body: String(body.body || ""),
        cta_text: body.cta_text || null,
        cta_url: body.cta_url || null,
        enabled: body.enabled !== false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "type" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, template: data });
}
