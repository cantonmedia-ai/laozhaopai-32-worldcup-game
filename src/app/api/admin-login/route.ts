import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_ACCESS_VALUE,
  getAdminPassword,
} from "@/lib/admin-password";

function safeNextPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin";
  }

  return value;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    password?: string;
    next?: string;
  } | null;

  if (String(body?.password ?? "") !== getAdminPassword()) {
    return NextResponse.json({ error: "Wrong admin password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, next: safeNextPath(body?.next) });
  response.cookies.set(ADMIN_ACCESS_COOKIE, ADMIN_ACCESS_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
