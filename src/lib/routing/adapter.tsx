"use client";

/**
 * Framework routing seam — Next.js implementation (the default).
 *
 * Shared components import navigation primitives from
 * `@/lib/routing/adapter` instead of `next/link` / `next/navigation`.
 * Under the Next.js build this file is what resolves, so behavior is
 * byte-for-byte what the app shipped before the TanStack migration.
 *
 * Under the TanStack Start (Vite) build, `vite.config.ts` aliases the
 * exact specifier `@/lib/routing/adapter` to `adapter.tanstack.tsx`,
 * which implements the same surface on @tanstack/react-router. Keep the
 * two files' exported API identical (see types below).
 *
 * At cutover (Next removal), inline the TanStack implementation here and
 * delete the alias.
 */

import NextLink from "next/link";
import {
  usePathname as useNextPathname,
  useRouter as useNextRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { parseLeaguePath, type LeagueTab } from "@/lib/leaguePath";

/** The subset of link props DraftSpa actually uses (next/link compatible). */
export type RouterLinkProps = {
  href: string;
  /** next/link prefetch hint; mapped to `preload` under TanStack Router. */
  prefetch?: boolean;
  children?: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

/** The subset of the app router DraftSpa actually uses. */
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

export function Link({ href, prefetch, children, ...rest }: RouterLinkProps) {
  return (
    <NextLink href={href} prefetch={prefetch} {...rest}>
      {children}
    </NextLink>
  );
}

export function useRouter(): RouterAdapter {
  return useNextRouter();
}

export function usePathname(): string | null {
  return useNextPathname();
}

export function useSearchParams(): SearchParamsAdapter | null {
  return useNextSearchParams();
}

/**
 * League URL params. Under Next.js there is no route param to read — every
 * /league/* URL rewrites onto the static shell — so this parses the browser
 * pathname (src/lib/leaguePath.ts), exactly as the app shipped. The TanStack
 * implementation reads typed route params instead; same observable contract
 * (see src/test/contracts/leagueRoutes/fixtures.ts).
 */
export function useLeagueParams(): LeagueRouteParams {
  return parseLeaguePath(useNextPathname());
}
