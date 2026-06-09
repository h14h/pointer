"use client";

import { useAuth } from "@clerk/nextjs";
import { PRO_PLAN_SLUG } from "./config";

export type ProStatus = {
  isLoaded: boolean;
  isSignedIn: boolean;
  isPro: boolean;
};

/**
 * Reads the user's Pro entitlement from Clerk billing.
 * Must be rendered inside <ClerkProvider> (i.e. only when auth is configured).
 */
export function usePro(): ProStatus {
  const { isLoaded, isSignedIn, has } = useAuth();
  return {
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    isPro: (isSignedIn && has?.({ plan: PRO_PLAN_SLUG })) ?? false,
  };
}
