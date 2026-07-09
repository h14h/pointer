/**
 * Framework routing seam — TanStack Router implementation.
 *
 * Never imported directly: `vite.config.ts` aliases the specifier
 * `@/lib/routing/adapter` here for the TanStack Start build only. The
 * Next.js build (and vitest/bun, which resolve through tsconfig paths)
 * keeps using `adapter.tsx`. Exported API must stay identical to
 * `adapter.tsx` — the shared types are imported type-only from there
 * (erased at build, so no next/* code leaks into the Vite bundle).
 */

import {
  Link as TanstackLink,
  useLocation,
  useParams,
  useRouter as useTanstackRouter,
  useSearch,
} from "@tanstack/react-router";
import { useMemo, type ComponentType, type ReactNode } from "react";
import { LEAGUE_TABS, type LeagueTab } from "@/lib/leaguePath";
import type {
  LeagueRouteParams,
  RouterAdapter,
  RouterLinkProps,
  SearchParamsAdapter,
} from "./adapter";

export type { LeagueRouteParams, RouterAdapter, RouterLinkProps, SearchParamsAdapter };

// TanStack Router types `to` against the registered route tree. This seam
// receives plain string hrefs (including /league/* URLs that are only
// registered in Phase 2), so it deliberately drops down to an untyped
// component — the adapter's public surface stays typed via RouterLinkProps.
const UntypedLink = TanstackLink as unknown as ComponentType<
  Record<string, unknown> & { children?: ReactNode }
>;

export function Link({ href, prefetch, children, ...rest }: RouterLinkProps) {
  return (
    <UntypedLink
      to={href}
      preload={prefetch === false ? false : undefined}
      {...rest}
    >
      {children}
    </UntypedLink>
  );
}

export function useRouter(): RouterAdapter {
  const router = useTanstackRouter();
  return useMemo(
    () => ({
      push: (href: string) => {
        // `href` (vs `to`) accepts a fully built path, incl. unregistered ones.
        void router.navigate({ href });
      },
      replace: (href: string) => {
        void router.navigate({ href, replace: true });
      },
      back: () => {
        router.history.back();
      },
    }),
    [router],
  );
}

export function usePathname(): string | null {
  return useLocation({ select: (location) => location.pathname });
}

export function useSearchParams(): SearchParamsAdapter | null {
  // Read the MATCHED ROUTE's search, not the global location's. Next.js's
  // useSearchParams stays pinned to the page's own params until the page
  // unmounts; useLocation-based search updates globally the moment a
  // navigation commits, re-firing effects on the outgoing page with the NEW
  // location's (typically empty) search — which made the legacy /settings
  // redirect double-fire and land on the wrong tab.
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  return useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(search)) {
      if (value === undefined) continue;
      params.set(key, typeof value === "string" ? value : JSON.stringify(value));
    }
    return params;
  }, [search]);
}

/**
 * League URL params, read from the typed route params of the /league routes
 * (src/routes/league.$leagueId.index.tsx and league.$leagueId.$.tsx) instead
 * of re-parsing the pathname. Contract (same as the Next impl / leaguePath):
 *   - `_splat` may hold a tab plus extra segments; only the first non-empty
 *     segment counts, and it must exactly match a known tab or "draft" —
 *     anything else falls back to "plan".
 *   - the reserved "league-shell" id yields leagueId null (bounces home).
 * pushState tab switches keep working: TanStack's browser history patches
 * window.history.pushState, so the router re-matches and params update.
 */
export function useLeagueParams(): LeagueRouteParams {
  const { leagueId, _splat } = useParams({ strict: false }) as {
    leagueId?: string;
    _splat?: string;
  };
  if (!leagueId || leagueId === "league-shell") {
    return { leagueId: null, tab: "plan" };
  }
  const tabSegment = (_splat ?? "").split("/").filter(Boolean)[0] ?? "";
  const tab: LeagueTab =
    tabSegment === "draft" ||
    (LEAGUE_TABS as readonly string[]).includes(tabSegment)
      ? (tabSegment as LeagueTab)
      : "plan";
  return { leagueId, tab };
}
