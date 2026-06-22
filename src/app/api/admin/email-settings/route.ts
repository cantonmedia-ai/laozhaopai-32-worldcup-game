import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getEmailState } from "@/lib/email/data";

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;

  const state = await getEmailState();
  return NextResponse.json(state);
}
