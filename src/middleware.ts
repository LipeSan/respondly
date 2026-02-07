export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/reviews/:path*", "/rules/:path*", "/templates/:path*", "/settings/:path*"],
};