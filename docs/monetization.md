# Monetization (DraftSpa Pro)

DraftSpa's free tier is the full client-side experience: projections, scoring,
draft tracking, multiple local leagues. Everything that runs in the browser
costs nothing to serve and stays free. **Pro** covers cloud league storage and
live multi-device sync.

- **Auth:** [Clerk](https://clerk.com) (sign-in only, not billing)
- **Payments:** [Polar](https://polar.sh) (one-time Founding Pro, merchant of record)
- **Database + realtime sync:** [Convex](https://convex.dev) (entitlements + per-user league documents)

The integration is **opt-in by configuration**. With no env vars set, the app
builds and runs exactly as before. Missing Polar keys show "payments not live on this build"
instead of a fake checkout.

## Source Files

- `src/lib/pro/config.ts`
- `src/lib/pro/lastKnownPro.ts`
- `src/lib/pro/usePro.ts`
- `src/components/providers/AppProviders.tsx`
- `src/components/pro/ConfirmPro.tsx`
- `src/components/pro/CheckoutButton.tsx`
- `src/components/pro/CloudSync.tsx`
- `src/routes/pricing.tsx`
- `convex/schema.ts`, `convex/leagues.ts`, `convex/entitlements.ts`, `convex/polar.ts`, `convex/http.ts`

## Setup

### 1. Clerk (auth only)

1. Create an application at https://dashboard.clerk.com.
2. Copy the publishable key into `.env.local` as `VITE_CLERK_PUBLISHABLE_KEY`.
3. Do not enable Clerk Billing. Checkout is Polar.
4. JWT template named `convex` (aud = convex). Issuer goes to Convex as `CLERK_FRONTEND_API_URL`.

### 2. Polar

1. Create a one-time product Founding Pro at $10.
2. Product id -> `VITE_POLAR_PRODUCT_ID` and Convex `POLAR_PRODUCT_ID`.
3. Access token -> Convex `POLAR_ACCESS_TOKEN`.
4. Webhook -> `https://<deployment>.convex.site/polar/webhook` for order.paid and order.refunded.
5. Optional `POLAR_SERVER=sandbox`.
6. Checkout sends the Clerk user id as `customer_external_id`.

### 3. Convex

1. Create a DraftSpa project. Set `CLERK_FRONTEND_API_URL`.
2. Set Polar env vars. Missing keys = honest stub.
3. Deploy convex functions from this repo.
4. Mirror the deployment URL as `VITE_CONVEX_URL`.

## How entitlement works

1. Anonymous / free: local persist only. Convex is never initialized.
2. Signed in, not Pro: Clerk session, still local, no CloudSync.
3. Checkout: Polar. After return, ConfirmPro writes lastKnownPro.
4. Polar webhook writes clerkUserId, status, period on order.paid.
5. League upsert/remove require an active entitlement.
