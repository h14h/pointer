# Monetization (Pointer Pro)

Pointer's free tier is the full client-side experience: projections, scoring,
draft tracking, multiple local leagues — everything that runs in the browser
costs nothing to serve and stays free. **Pro** covers the features that cost
real money to operate: cloud league storage and live multi-device sync (e.g.
tracking a draft on a laptop while the leaderboard follows along on a phone).

- **Auth + billing:** [Clerk](https://clerk.com) (subscriptions via Clerk
  Billing, no separate Stripe integration to maintain)
- **Database + realtime sync:** [Convex](https://convex.dev) (per-user league
  documents, broadcast to all of a user's devices)

The integration is **opt-in by configuration**. With no env vars set, the app
builds and runs exactly as before — no sign-in UI, no network calls. This
keeps local development, self-hosting, and the free product untouched.

## Source Files

- `src/lib/pro/config.ts` — env-based feature flags (`isAuthConfigured`, `isCloudConfigured`), `PRO_PLAN_SLUG`
- `src/lib/pro/usePro.ts` — Pro entitlement hook (Clerk `has({ plan: "pro" })`)
- `src/components/providers/AppProviders.tsx` — conditional `ClerkProvider` + `ConvexProviderWithClerk` wrapper
- `src/components/pro/AccountControls.tsx` — header sign-in / account / Go Pro controls
- `src/components/pro/CloudSync.tsx` — two-way league sync for Pro users
- `src/app/pricing/page.tsx` — pricing page (`<PricingTable />`)
- `src/proxy.ts` — Clerk middleware (no-op when unconfigured)
- `convex/schema.ts`, `convex/leagues.ts`, `convex/auth.config.ts` — Convex backend
- Store support: `applyCloudLeagues`, `clearDeletedLeagueIds`, `deletedLeagueIds` tombstones in `src/store/index.ts`

## Setup

### 1. Clerk

1. Create an application at <https://dashboard.clerk.com>.
2. Copy the keys into `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...
   ```
3. **Billing:** enable Billing in the Clerk dashboard (Billing → Settings),
   connect Stripe, and create a subscription plan with slug **`pro`** (the
   slug must match `PRO_PLAN_SLUG` in `src/lib/pro/config.ts`). The pricing
   page renders Clerk's `<PricingTable />`, so plans/prices are managed
   entirely in the Clerk dashboard.
4. **JWT template for Convex:** in Clerk dashboard → JWT Templates, create a
   template named **`convex`** (Clerk has a Convex preset). Note the Issuer
   domain (e.g. `https://your-app.clerk.accounts.dev`).

### 2. Convex

1. Run `bunx convex dev` once locally — it creates the project, writes
   `CONVEX_DEPLOYMENT`/`NEXT_PUBLIC_CONVEX_URL` to `.env.local`, pushes
   `convex/` functions, and regenerates `convex/_generated/` (checked-in
   copies exist so the app type-checks without a deployment).
2. In the Convex dashboard → Settings → Environment Variables, set
   `CLERK_JWT_ISSUER_DOMAIN` to the Clerk issuer domain from step 1.4
   (consumed by `convex/auth.config.ts`).
3. For production: `bunx convex deploy` and set `NEXT_PUBLIC_CONVEX_URL` to
   the production deployment URL (see Deploy below — it's a build arg, not a
   Fly secret).

### 3. Deploy (Fly.io)

The two `NEXT_PUBLIC_*` values are inlined into the client bundles at image
build, so they go in `fly.toml` under `[build.args]` (they're publishable,
safe to commit — placeholders are already there, commented):

```toml
[build.args]
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_..."
  NEXT_PUBLIC_CONVEX_URL = "https://<deployment>.convex.cloud"
```

Server-side secrets go through the Fly CLI as usual:

```
fly secrets set CLERK_SECRET_KEY=sk_...
# CONVEX_DEPLOY_KEY is only needed in CI for `convex deploy`
```

Then `fly deploy` — changing a `[build.args]` value requires a redeploy
(rebuild), not just a secrets update.

## How sync works

`CloudSync` renders nothing and only mounts for signed-in Pro users:

- **Pull:** `api.leagues.list` is a reactive Convex query; any remote league
  newer than the local copy (by `updatedAt`) replaces it, and unknown remote
  leagues are added. Convex pushes updates over websocket, so a pick made on
  one device appears on another within a second or two.
- **Push:** local leagues newer than the cloud copy are upserted, debounced
  1.5s. The server ignores stale writes (`updatedAt` last-write-wins).
- **Delete:** locally deleted league ids are kept as tombstones
  (`deletedLeagueIds`, persisted) so a pull can't resurrect them; the cloud
  copy is removed, then the tombstone is cleared.

Projection groups are *not* synced (they can be tens of MB of player data);
leagues — settings, rosters, draft state — are, which is what matters on
draft day.

## Free vs Pro

| Capability | Free | Pro |
|---|---|---|
| Baseball + football draft boards, projections upload, scoring, PAR | ✓ | ✓ |
| Draft mode, keepers, unlimited local leagues | ✓ | ✓ |
| Cloud backup of leagues | — | ✓ |
| Live multi-device sync on draft day | — | ✓ |
| Account that follows you across browsers/devices | — | ✓ |
| Future: premium projections, player overrides | — | planned |
