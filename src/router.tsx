import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * TanStack Start router entry (see vite.config.ts). One router instance per
 * request/window; routes live in src/routes (file-based).
 */
export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    // Matches next/link behavior the app relied on: LeagueCard opts out of
    // prefetch explicitly, everything else is fine without eager preloads.
    defaultPreload: false,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
