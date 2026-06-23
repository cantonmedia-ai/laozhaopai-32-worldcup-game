import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;

  if (!hasSupabaseServiceEnv()) {
    return NextResponse.json(
      { error: "Supabase service role is not configured." },
      { status: 500 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("admin_run_game1_simulation");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
