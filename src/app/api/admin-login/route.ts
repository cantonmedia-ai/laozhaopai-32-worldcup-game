import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_ACCESS_VALUE,
  getAdminPassword,
} from "@/lib/admin-password";
import { logUserAction } from "@/lib/monitoring";

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
    await logUserAction({
      actionType: "admin_login",
      actionStatus: "failed",
      pagePath: "/admin-login",
      gameKey: "admin",
      message: "Admin login failed.",
    });
    return NextResponse.json({ error: "Wrong admin password." }, { status: 401 });
  }

  await logUserAction({
    userEmail: process.env.ADMIN_EMAIL || "deric@cantonkitchen.com.my",
    actionType: "admin_login",
    actionStatus: "success",
    pagePath: "/admin-login",
    gameKey: "admin",
    message: "Admin password login succeeded.",
  });

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
