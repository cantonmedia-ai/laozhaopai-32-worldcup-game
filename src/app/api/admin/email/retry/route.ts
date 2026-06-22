import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;
  if (!hasSupabaseServiceEnv()) {
    return NextResponse.json({ error: "Supabase service key is not configured." }, { status: 500 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Queue id is required." }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("email_queue")
    .update({
      status: "pending",
      scheduled_for: new Date().toISOString(),
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
