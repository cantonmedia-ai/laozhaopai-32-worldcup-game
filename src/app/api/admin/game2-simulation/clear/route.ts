import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { clearGame2Simulation } from "@/lib/game2-simulation";
import { logSystemError, logUserAction } from "@/lib/monitoring";
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

  try {
    await logUserAction({
      userId: admin.user.id,
      userEmail: admin.user.email,
      actionType: "simulation_clear_attempt",
      actionStatus: "info",
      pagePath: "/admin/self-test",
      gameKey: "admin",
      message: "Game 2 simulation clear attempted.",
    });
    const data = await clearGame2Simulation(createServiceClient());
    await logUserAction({
      userId: admin.user.id,
      userEmail: admin.user.email,
      actionType: "simulation_clear_success",
      actionStatus: "success",
      pagePath: "/admin/self-test",
      gameKey: "admin",
      message: "Game 2 simulation clear completed.",
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to clear simulation.";
    await logUserAction({
      userId: admin.user.id,
      userEmail: admin.user.email,
      actionType: "simulation_clear_failed",
      actionStatus: "failed",
      pagePath: "/admin/self-test",
      gameKey: "admin",
      message,
    });
    await logSystemError({
      userId: admin.user.id,
      userEmail: admin.user.email,
      errorType: "database_error",
      errorMessage: message,
      functionName: "clearGame2Simulation",
      pagePath: "/admin/self-test",
      gameKey: "admin",
    });
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
