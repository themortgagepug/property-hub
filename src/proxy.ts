import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and static assets through
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // Check for Supabase auth token in cookies
  // Supabase stores session in sb-<ref>-auth-token cookie
  const hasCookie = request.cookies.getAll().some(
    (c) => c.name.includes("sb-") && c.name.includes("auth-token")
  );

  if (!hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};
