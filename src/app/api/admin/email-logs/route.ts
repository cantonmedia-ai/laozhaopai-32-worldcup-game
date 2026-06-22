import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;
  if (!hasSupabaseServiceEnv()) return NextResponse.json({ logs: [] });

  const { searchParams } = request.nextUrl;
  const supabase = createServiceClient();
  let query = supabase
    .from("email_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  if (type) query = query.eq("email_type", type);
  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("recipient_email", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}
