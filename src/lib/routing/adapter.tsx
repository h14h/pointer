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
