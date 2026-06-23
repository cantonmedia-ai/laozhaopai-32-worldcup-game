import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { loadLiveMonitorData, logsToCsv, type LiveMonitorFilters } from "@/lib/live-monitor";

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;

  const searchParams = request.nextUrl.searchParams;
  const filters: LiveMonitorFilters = {
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    status: searchParams.get("status") || undefined,
    actionType: searchParams.get("actionType") || undefined,
    errorType: searchParams.get("errorType") || undefined,
    area: searchParams.get("area") || undefined,
    user: searchParams.get("user") || undefined,
    referralCode: searchParams.get("referralCode") || undefined,
  };
  const data = await loadLiveMonitorData(filters);
  const csv = logsToCsv(data.actions, data.errors);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="brainwave-live-monitor-${Date.now()}.csv"`,
    },
  });
}
