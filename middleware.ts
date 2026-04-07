import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // For HTML page navigations, prevent caching so new JS chunk references are always served
  if (request.headers.get("accept")?.includes("text/html")) {
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
  }

  return response;
}

export const config = {
  matcher: [
    // Match all pages except static files and API routes
    "/((?!_next/static|_next/image|favicon|icons|api).*)",
  ],
};
