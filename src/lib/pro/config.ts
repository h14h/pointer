// Pro tier configuration. The app runs fully featured (and free) without any
// of these env vars — cloud features only light up when Clerk + Convex are
// configured. See docs/monetization.md for setup.
//
// Read through BOTH frameworks' public-env conventions while Next.js and
// TanStack Start coexist: NEXT_PUBLIC_* (inlined by Next) and VITE_* (inlined
// by Vite via import.meta.env). Keep the literal `process.env.NEXT_PUBLIC_…`
// and `import.meta.env.VITE_…` member expressions intact — both bundlers
// replace them statically.

export const PRO_PLAN_SLUG = "pro";

type ViteEnv = Record<string, string | undefined> | undefined;

function viteEnv(): ViteEnv {
  // `import.meta.env` only exists under Vite (plus vitest/bun shims); guard
  // the property access so Next browser bundles don't crash.
  return (import.meta as unknown as { env?: ViteEnv }).env;
}

export function getClerkPublishableKey(): string | undefined {
  return (
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      : undefined) ?? viteEnv()?.VITE_CLERK_PUBLISHABLE_KEY
  );
}

export function getConvexUrl(): string | undefined {
  return (
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_CONVEX_URL
      : undefined) ?? viteEnv()?.VITE_CONVEX_URL
  );
}

/** Auth (sign-in, billing) is available. */
export function isAuthConfigured(): boolean {
  return Boolean(getClerkPublishableKey());
}

/** Cloud league sync is available (requires auth + Convex). */
export function isCloudConfigured(): boolean {
  return Boolean(getClerkPublishableKey() && getConvexUrl());
}
