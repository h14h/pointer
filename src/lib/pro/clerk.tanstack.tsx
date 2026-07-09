/**
 * Vite-only stand-in for `@clerk/nextjs` (aliased in vite.config.ts).
 *
 * @clerk/nextjs cannot load outside a Next.js runtime (its ESM output has
 * extensionless internal imports and next/* dependencies), so the TanStack
 * Start build swaps in this module. Phase 1 doesn't port the Clerk/Convex
 * providers — auth is only reachable when NEXT_PUBLIC_/VITE_ Clerk env keys
 * are configured, which the Start app doesn't do yet — so these components
 * are unreachable at runtime; the hooks return signed-out state defensively.
 *
 * Phase 3 (providers) replaces this with @clerk/tanstack-react-start (or
 * @clerk/clerk-react) wired into the root route.
 */

import type { ReactNode } from "react";

function unreachable(component: string): never {
  throw new Error(
    `${component} from @clerk/nextjs is not available in the TanStack Start build yet ` +
      "(Clerk providers are ported in a later migration phase). " +
      "Unset VITE_CLERK_PUBLISHABLE_KEY or finish the provider port.",
  );
}

export function ClerkProvider(_props: {
  publishableKey?: string;
  children?: ReactNode;
}): ReactNode {
  return unreachable("ClerkProvider");
}

export function SignInButton(_props: {
  mode?: string;
  children?: ReactNode;
}): ReactNode {
  return unreachable("SignInButton");
}

export function UserButton(): ReactNode {
  return unreachable("UserButton");
}

export function PricingTable(): ReactNode {
  return unreachable("PricingTable");
}

/** Matches the slice of Clerk's useAuth that DraftSpa consumes. */
export function useAuth(): {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  has: ((params: { plan: string }) => boolean) | undefined;
  getToken: (options?: { template?: string }) => Promise<string | null>;
} {
  return {
    isLoaded: true,
    isSignedIn: false,
    has: undefined,
    getToken: async () => null,
  };
}
