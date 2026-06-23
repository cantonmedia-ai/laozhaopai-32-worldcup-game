import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { runGame2Simulation } from "@/lib/game2-simulation";
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
      actionType: "simulation_run_attempt",
      actionStatus: "info",
      pagePath: "/admin/self-test",
      gameKey: "admin",
      message: "Game 2 simulation run attempted.",
    });
    const data = await runGame2Simulation(createServiceClient());
    await logUserAction({
      userId: admin.user.id,
      userEmail: admin.user.email,
      actionType: "simulation_run_success",
      actionStatus: "success",
      pagePath: "/admin/self-test",
      gameKey: "admin",
      message: "Game 2 simulation run completed.",
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run simulation.";
    await logUserAction({
      userId: admin.user.id,
      userEmail: admin.user.email,
      actionType: "simulation_run_failed",
      actionStatus: "failed",
      pagePath: "/admin/self-test",
      gameKey: "admin",
      message,
    });
    await logSystemError({
      userId: admin.user.id,
      userEmail: admin.user.email,
      errorType: "scoring_error",
      errorMessage: message,
      functionName: "runGame2Simulation",
      pagePath: "/admin/self-test",
      gameKey: "admin",
    });
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
