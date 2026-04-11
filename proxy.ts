import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/auth/admin";

/* ── Route definitions ────────────────────────── */

/** Exact public routes (no auth required) */
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/promo", "/pricing"];

/** Public route prefixes — any path starting with these is public */
const PUBLIC_PREFIXES = ["/legal/", "/share/", "/api/"];

/** Auth pages — authenticated users get redirected away */
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

/** Admin-only routes */
const ADMIN_PREFIXES = ["/admin"];

/** Protected routes — require authentication */
const PROTECTED_PREFIXES = [
  "/feed", "/flairer", "/matches", "/profile", "/notifications",
  "/stories", "/score", "/admin", "/onboarding", "/events",
  "/carte", "/animals", "/animaux",
];

/* ── Helpers ──────────────────────────────────── */
const isPublic = (p: string) => PUBLIC_ROUTES.includes(p) || PUBLIC_PREFIXES.some((x) => p.startsWith(x));
const isProtected = (p: string) => PROTECTED_PREFIXES.some((x) => p.startsWith(x));
const isAdmin = (p: string) => ADMIN_PREFIXES.some((x) => p.startsWith(x));
const isAuth = (p: string) => AUTH_ROUTES.some((x) => p.startsWith(x));

/* ── Proxy ────────────────────────────────────── */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — keeps auth token fresh & syncs cookies
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Authenticated users → redirect away from auth pages
  if (user && isAuth(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/profile";
    return NextResponse.redirect(url);
  }

  // Public routes → allow through
  if (isPublic(path)) {
    if (request.headers.get("accept")?.includes("text/html")) {
      supabaseResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    }
    return supabaseResponse;
  }

  // Protected routes → require authentication
  if (!user && isProtected(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  // Admin routes → require admin email
  if (isAdmin(path)) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectTo", path);
      return NextResponse.redirect(url);
    }
    if (!isAdminEmail(user.email || "")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // Prevent HTML caching
  if (request.headers.get("accept")?.includes("text/html")) {
    supabaseResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    supabaseResponse.headers.set("Pragma", "no-cache");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3)$).*)",
  ],
};
