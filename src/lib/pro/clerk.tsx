/**
 * Clerk seam: the app's single import point for Clerk UI + hooks.
 *
 * Re-exports the framework-agnostic React SDK, `@clerk/react` — the same
 * package `@clerk/nextjs` wrapped before the TanStack Start cutover, so the
 * running Clerk code is unchanged from what the app shipped under Next.
 *
 * Why @clerk/react and not @clerk/tanstack-react-start: the Start SDK
 * requires clerkMiddleware() in the server handler plus server functions for
 * auth state — server pieces DraftSpa's SPA-mode build (ssr: false,
 * prerendered shell, free-tier static hosting) deliberately doesn't have.
 * The plain React SDK is fully client-side, and it's what Convex's own docs
 * pair with ConvexProviderWithClerk.
 *
 * Module surface: only the names the app actually uses (AppProviders,
 * AccountControls, usePro, pricing page). Add re-exports here if a component
 * starts needing more.
 *
 * Runtime prop contracts:
 * - ClerkProvider receives an explicit `publishableKey` from AppProviders
 *   (which only renders it when the key is configured — @clerk/react has no
 *   env fallback and throws without a key).
 * - useAuth().getToken({ template: "convex" }) drives ConvexProviderWithClerk.
 * - Redirect-style navigations (sign-out, checkout return) fall back to
 *   full-page loads since no router functions are passed; DraftSpa's auth
 *   flows are modal-based (SignInButton mode="modal", PricingTable), so no
 *   in-app route handoff is needed.
 */

export {
  ClerkProvider,
  PricingTable,
  SignInButton,
  UserButton,
  useAuth,
} from "@clerk/react";
