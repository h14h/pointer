// Pro tier configuration. The app runs fully featured (and free) without any
// of these env vars — cloud features only light up when Clerk + Convex are
// configured. See docs/monetization.md for setup.

export const PRO_PLAN_SLUG = "pro";

export function getClerkPublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

export function getConvexUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_CONVEX_URL;
}

/** Auth (sign-in, billing) is available. */
export function isAuthConfigured(): boolean {
  return Boolean(getClerkPublishableKey());
}

/** Cloud league sync is available (requires auth + Convex). */
export function isCloudConfigured(): boolean {
  return Boolean(getClerkPublishableKey() && getConvexUrl());
}
