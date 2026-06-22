import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_ACCESS_COOKIE, ADMIN_ACCESS_VALUE } from "@/lib/admin-password";

export async function requireAdminApi(request: NextRequest) {
  if (request.cookies.get(ADMIN_ACCESS_COOKIE)?.value === ADMIN_ACCESS_VALUE) {
    return {
      ok: true as const,
      user: {
        id: "admin-password",
        email: process.env.ADMIN_EMAIL || "deric@cantonkitchen.com.my",
      },
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Supabase is not configured." }, { status: 500 }),
    };
  }

  const response = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Please sign in first." }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!["admin", "owner"].includes(String(profile?.role ?? ""))) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Admin access required." }, { status: 403 }),
    };
  }

  return { ok: true as const, user };
}
