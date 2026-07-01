import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q")?.trim() ?? "";
  const country = searchParams.get("country")?.trim() ?? "";
  const sort = searchParams.get("sort") === "newest" ? "newest" : "oldest";

  const supabase = createServiceClient();
  let query = supabase
    .from("players")
    .select("id, name, selected_country, selected_country_code, group_name, created_at", {
      count: "exact",
    })
    .eq("is_disqualified", false);

  if (q) query = query.ilike("name", `%${q}%`);
  if (country) query = query.eq("selected_country", country);

  const { data, count, error } = await query
    .order("created_at", { ascending: sort === "oldest" })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: "Unable to load players." }, { status: 500 });
  }

  return NextResponse.json({ players: data ?? [], total: count ?? 0 });
}
