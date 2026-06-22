import { NextResponse, type NextRequest } from "next/server";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/game";
  return value;
}

function getPublicOrigin(requestUrl: URL) {
  if (
    requestUrl.hostname === "localhost" ||
    requestUrl.hostname === "127.0.0.1"
  ) {
    return requestUrl.origin;
  }

  return "https://games.brainwaveai.my";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error_description");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const origin = getPublicOrigin(requestUrl);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Login link is missing a code. Please try again.")}`,
    );
  }

  const finishUrl = new URL("/auth/finish", origin);
  finishUrl.searchParams.set("code", code);
  finishUrl.searchParams.set("next", next);
  return NextResponse.redirect(finishUrl);
}
