import { NextResponse, type NextRequest } from "next/server";
import { isRequestAuthenticated, isSameOriginMutation, sessionCookieSettings } from "@/lib/auth";
import { FORBIDDEN, UNAUTHORIZED, NO_STORE_HEADERS } from "@/lib/api";

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return FORBIDDEN();
  if (!isRequestAuthenticated(request)) return UNAUTHORIZED();
  const response = NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  response.cookies.set(sessionCookieSettings.name, "", { ...sessionCookieSettings.options, maxAge: 0 });
  return response;
}
