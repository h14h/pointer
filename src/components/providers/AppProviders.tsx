"use client";

import { useMemo, type ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import {
  getClerkPublishableKey,
  getConvexUrl,
  isAuthConfigured,
  isCloudConfigured,
} from "@/lib/pro/config";
import { CloudSync } from "@/components/pro/CloudSync";

function ConvexWithClerk({ children }: { children: ReactNode }) {
  const convexUrl = getConvexUrl();
  const convex = useMemo(() => new ConvexReactClient(convexUrl as string), [convexUrl]);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <CloudSync />
      {children}
    </ConvexProviderWithClerk>
  );
}

/**
 * Wraps the app in Clerk (auth + billing) and Convex (cloud sync) providers
 * when they are configured. Without env keys the app renders bare — fully
 * functional, local-only, free.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  if (!isAuthConfigured()) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={getClerkPublishableKey()}>
      {isCloudConfigured() ? <ConvexWithClerk>{children}</ConvexWithClerk> : children}
    </ClerkProvider>
  );
}
