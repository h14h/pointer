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

import { Link as TanstackLink, useLocation, useRouter as useTanstackRouter } from "@tanstack/react-router";
import { useMemo, type ComponentType, type ReactNode } from "react";
import type {
  RouterAdapter,
  RouterLinkProps,
  SearchParamsAdapter,
} from "./adapter";

export type { RouterAdapter, RouterLinkProps, SearchParamsAdapter };

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
  const searchStr = useLocation({ select: (location) => location.searchStr });
  return useMemo(() => new URLSearchParams(searchStr), [searchStr]);
}
