// Pro tier configuration. The app runs fully featured (and free) without any
// of these env vars — cloud features only light up when Clerk + Convex are
// configured. See docs/monetization.md for setup.
//
// The VITE_* values are PUBLIC (publishable key / deployment URL, safe to
// commit) and are inlined into the client bundle by Vite at build time. Keep
// the literal `import.meta.env.VITE_…` member expressions intact — Vite
// replaces them statically.

export const PRO_PLAN_SLUG = "pro";

export function getClerkPublishableKey(): string | undefined {
  return import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
}

export function getConvexUrl(): string | undefined {
  return import.meta.env.VITE_CONVEX_URL;
}

/** Auth (sign-in, billing) is available. */
export function isAuthConfigured(): boolean {
  return Boolean(getClerkPublishableKey());
}

/** Cloud league sync is available (requires auth + Convex). */
export function isCloudConfigured(): boolean {
  return Boolean(getClerkPublishableKey() && getConvexUrl());
}
