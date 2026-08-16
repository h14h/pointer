export function getClerkPublishableKey(): string | undefined {
  return import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
}

export function getConvexUrl(): string | undefined {
  return import.meta.env.VITE_CONVEX_URL;
}

export function getPolarProductId(): string | undefined {
  return import.meta.env.VITE_POLAR_PRODUCT_ID;
}

export function isAuthConfigured(): boolean {
  return Boolean(getClerkPublishableKey());
}

export function isCloudConfigured(): boolean {
  return Boolean(getClerkPublishableKey() && getConvexUrl());
}

export function isPaymentsConfigured(): boolean {
  return Boolean(getPolarProductId() && isCloudConfigured());
}
