import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
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

  const supabase = createServiceClient();
  await logUserAction({
    userId: admin.user.id,
    userEmail: admin.user.email,
    actionType: "simulation_run_attempt",
    actionStatus: "info",
    pagePath: "/admin/self-test",
    gameKey: "admin",
    message: "Game 1 simulation run attempted.",
  });
  const { data, error } = await supabase.rpc("admin_run_game1_simulation");

  if (error) {
    await logUserAction({
      userId: admin.user.id,
      userEmail: admin.user.email,
      actionType: "simulation_run_failed",
      actionStatus: "failed",
      pagePath: "/admin/self-test",
      gameKey: "admin",
      message: error.message,
    });
    await logSystemError({
      userId: admin.user.id,
      userEmail: admin.user.email,
      errorType: "scoring_error",
      errorMessage: error.message,
      functionName: "admin_run_game1_simulation",
      pagePath: "/admin/self-test",
      gameKey: "admin",
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logUserAction({
    userId: admin.user.id,
    userEmail: admin.user.email,
    actionType: "simulation_run_success",
    actionStatus: "success",
    pagePath: "/admin/self-test",
    gameKey: "admin",
    message: "Game 1 simulation run completed.",
  });

  return NextResponse.json(data);
}
