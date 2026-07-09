import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Clerk middleware only runs when auth is configured; otherwise the app stays
// a fully static/local experience with no auth overhead.
const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

const clerkHandler = isClerkConfigured
  ? clerkMiddleware()
  : () => NextResponse.next();

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  // Tidewave Web rewrites /tidewave/* to the Pages API handler.
  if (req.nextUrl.pathname.startsWith("/tidewave")) {
    return NextResponse.rewrite(new URL("/api/tidewave", req.url));
  }

  return clerkHandler(req, event);
}

export const config = {
  matcher: [
    // Tidewave MCP/Web endpoint (must stay reachable in development)
    "/tidewave/:path*",
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
