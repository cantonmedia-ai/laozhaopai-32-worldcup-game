import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createServiceClient } from "@/lib/supabase/service";
import { toCsv } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Unable to export players." }, { status: 500 });
  }

  const headers = [
    "id",
    "name",
    "whatsapp",
    "email",
    "selected_country",
    "selected_country_code",
    "group_name",
    "created_at",
    "is_disqualified",
    "admin_note",
  ];
  const csv = toCsv(
    headers,
    (data ?? []).map((row) => headers.map((header) => row[header as keyof typeof row])),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="champion-guess-players.csv"',
    },
  });
}
