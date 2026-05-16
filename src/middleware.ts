import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const authMiddleware = withAuth({
  pages: {
    signIn: "/login",
  },
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const protectedPrefixes = [
    "/dashboard",
    "/onboarding",
    "/reviews",
    "/rules",
    "/templates",
    "/settings",
    "/configuration",
    "/google",
    "/subscription",
  ];

  const isProtected = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  return authMiddleware(req as NextRequestWithAuth, event);
}

export const config = {
  matcher: ["/:path*"],
};
