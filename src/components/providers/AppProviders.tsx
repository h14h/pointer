"use client";

import { useMemo, type ReactNode } from "react";
import { ClerkProvider, useAuth } from "@/lib/pro/clerk";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import {
  getClerkPublishableKey,
  getConvexUrl,
  isCloudConfigured,
} from "@/lib/pro/config";
import { CloudSync } from "@/components/pro/CloudSync";
import { ConfirmPro } from "@/components/pro/ConfirmPro";

function ConvexWithClerk({ children }: { children: ReactNode }) {
  const convexUrl = getConvexUrl();
  const convex = useMemo(() => new ConvexReactClient(convexUrl as string), [convexUrl]);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <ConfirmPro />
      <CloudSync />
      {children}
    </ConvexProviderWithClerk>
  );
}

function ConvexWhenSignedIn({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded || !isSignedIn || !isCloudConfigured()) {
    return <>{children}</>;
  }
  return <ConvexWithClerk>{children}</ConvexWithClerk>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const publishableKey = getClerkPublishableKey();
  if (!publishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ConvexWhenSignedIn>{children}</ConvexWhenSignedIn>
    </ClerkProvider>
  );
}
