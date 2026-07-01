import { NextResponse } from "next/server";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (hasSupabaseServerEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/fifa-champion-guess", request.url), 303);
}
