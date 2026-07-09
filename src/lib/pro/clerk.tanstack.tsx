/**
 * Vite-only stand-in for `@clerk/nextjs` (aliased in vite.config.ts).
 *
 * @clerk/nextjs cannot load outside a Next.js runtime (its ESM output has
 * extensionless internal imports and next/* dependencies), so the TanStack
 * Start build swaps in this module. It re-exports the framework-agnostic
 * React SDK — `@clerk/react` — which is the exact package @clerk/nextjs
 * itself wraps (pinned to the same version the Next build resolves), so both
 * builds run identical Clerk code.
 *
 * Why @clerk/react and not @clerk/tanstack-react-start: the Start SDK
 * requires clerkMiddleware() in the server handler plus server functions for
 * auth state — server pieces DraftSpa's SPA-mode build (ssr: false,
 * prerendered shell, free-tier static hosting) deliberately doesn't have.
 * The plain React SDK is fully client-side, and it's what Convex's own docs
 * pair with ConvexProviderWithClerk.
 *
 * Module surface: only the names shared components import from
 * `@clerk/nextjs` (AppProviders, AccountControls, usePro, pricing page).
 * Add re-exports here if a shared component starts importing more.
 *
 * Runtime prop contracts match the Next path:
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
