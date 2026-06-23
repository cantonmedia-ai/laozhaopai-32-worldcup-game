import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { fallbackTemplates } from "@/lib/email/data";
import { createServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi(request);
  if (!admin.ok) return admin.response;
  if (!hasSupabaseServiceEnv()) {
    return NextResponse.json({ error: "Supabase service key is not configured." }, { status: 500 });
  }

  const type = request.nextUrl.searchParams.get("type");
  if (!type) return NextResponse.json({ error: "Email type is required." }, { status: 400 });

  const supabase = createServiceClient();
  const fallback = fallbackTemplates.find((template) => template.type === type);

  let { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("type", type)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data && fallback) {
    const result = await supabase
      .from("email_templates")
      .insert(fallback)
      .select()
      .single();

    data = result.data;
    error = result.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Template not found." }, { status: 404 });

  return NextResponse.json({ ok: true, template: data });
}
