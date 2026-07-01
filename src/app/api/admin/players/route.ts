import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q")?.trim() ?? "";
  const country = searchParams.get("country")?.trim() ?? "";

  const supabase = createServiceClient();
  let query = supabase.from("players").select("*", { count: "exact" });

  if (q) {
    query = query.or(`name.ilike.%${q}%,whatsapp.ilike.%${q}%,email.ilike.%${q}%`);
  }
  if (country) query = query.eq("selected_country", country);

  const { data, count, error } = await query.order("created_at", { ascending: false }).limit(500);

  if (error) {
    return NextResponse.json({ error: "Unable to load players." }, { status: 500 });
  }

  return NextResponse.json({ players: data ?? [], total: count ?? 0 });
}
