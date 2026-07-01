import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createServiceClient } from "@/lib/supabase/service";
import { toCsv } from "@/lib/csv";
import { prizeForRank } from "@/lib/champion-prizes";

type WinnerExportRow = {
  id: string;
  rank: number;
  is_winner: boolean;
  status: string;
  selected_country: string;
  prize_collected_at: string | null;
  admin_note: string | null;
  players: {
    name: string;
    whatsapp: string;
    email: string | null;
    created_at: string;
  } | null;
};

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("winners")
    .select("id, rank, is_winner, status, selected_country, prize_collected_at, admin_note, players(name, whatsapp, email, created_at)")
    .order("rank", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Unable to export winners." }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as WinnerExportRow[];
  const csv = toCsv(
    [
      "rank",
      "prize_tier",
      "prize_name",
      "prize_value",
      "is_winner",
      "status",
      "name",
      "whatsapp",
      "email",
      "selected_country",
      "submitted_at",
      "prize_collected_at",
      "admin_note",
    ],
    rows.map((row) => {
      const prize = row.is_winner ? prizeForRank(row.rank) : null;
      return [
        row.rank,
        prize?.tier,
        prize?.prize,
        prize?.value,
        row.is_winner,
        row.status,
        row.players?.name,
        row.players?.whatsapp,
        row.players?.email,
        row.selected_country,
        row.players?.created_at,
        row.prize_collected_at,
        row.admin_note,
      ];
    }),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="champion-guess-winners.csv"',
    },
  });
}
