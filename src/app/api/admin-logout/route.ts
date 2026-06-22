import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_ACCESS_COOKIE } from "@/lib/admin-password";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/admin-login", request.url), 303);
  response.cookies.set(ADMIN_ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
