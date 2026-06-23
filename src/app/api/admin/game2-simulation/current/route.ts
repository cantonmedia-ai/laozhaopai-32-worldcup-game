import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getGame2Simulation } from "@/lib/game2-simulation";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;

  if (!hasSupabaseServiceEnv()) {
    return NextResponse.json(
      { error: "Supabase service role is not configured." },
      { status: 500 },
    );
  }

  try {
    const data = await getGame2Simulation(createServiceClient());
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load simulation." },
      { status: 500 },
    );
  }
}
