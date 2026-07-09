/**
 * Routing adapter — the app's navigation surface over @tanstack/react-router.
 *
 * Shared components import navigation primitives from `@/lib/routing/adapter`
 * instead of the router package directly. This started as the seam that let
 * the Next.js and TanStack Start builds share components during the
 * migration; it survives the cutover because it keeps the component tree
 * decoupled from router specifics (and gives tests one obvious mock point).
 */

import {
  Link as TanstackLink,
  useLocation,
  useParams,
  useRouter as useTanstackRouter,
  useSearch,
} from "@tanstack/react-router";
import { useMemo, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from "react";
import { LEAGUE_TABS, type LeagueTab } from "@/lib/leaguePath";

/** The subset of link props DraftSpa actually uses. */
export type RouterLinkProps = {
  href: string;
  /** Prefetch hint; mapped to `preload` under TanStack Router. */
  prefetch?: boolean;
  children?: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

/** The subset of the router DraftSpa actually uses. */
export type RouterAdapter = {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
};

/** Read-only search params surface (URLSearchParams-compatible). */
export type SearchParamsAdapter = {
  get: (name: string) => string | null;
};

/**
 * The league id + tab named by the current /league/* URL.
 * `leagueId` is null off-route, when the id segment is missing, or when it is
 * the reserved "league-shell" segment. `tab` falls back to "plan" for any
 * unknown/malformed tab segment (stale bookmarks still land somewhere useful).
 */
export type LeagueRouteParams = { leagueId: string | null; tab: LeagueTab };

// TanStack Router types `to` against the registered route tree. This adapter
// receives plain string hrefs (including built /league/* URLs), so it
// deliberately drops down to an untyped component — the adapter's public
// surface stays typed via RouterLinkProps.
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
  // Read the MATCHED ROUTE's search, not the global location's. The app's
  // effects (e.g. the legacy /settings redirect) expect a page's search
  // params to stay pinned until the page unmounts; useLocation-based search
  // updates globally the moment a navigation commits, re-firing effects on
  // the outgoing page with the NEW location's (typically empty) search.
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
 * (src/routes/league.$leagueId.index.tsx and league.$leagueId.$.tsx).
 * Contract (locked by src/test/contracts/leagueRoutes/fixtures.ts and
 * e2e/league-url-contract.spec.ts):
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
