import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tidewave from "tidewave/vite-plugin";
import { defineConfig, type Connect, type Plugin } from "vite";
import { cacheControlForPath } from "./src/lib/publicDatasetsCachePolicy";

// TanStack Start build (coexists with Next.js until cutover).
// - `bun run dev:start`   → dev server on :3200 (3000/3099 belong to Next)
// - `bun run build:start` → production build
// Next.js never reads this file; vitest uses vitest.config.ts.
const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Serving-layer cache headers mirroring the Next.js posture (see
// src/lib/publicDatasetsCachePolicy.ts for values + rationale):
// - /datasets/*            ← next.config.ts headers()
// - /api/public-datasets*  ← Next force-static output (`s-maxage=31536000`)
// Applied in dev AND preview so curl/Playwright observe production headers.
// The phase-5 production host (Nitro routeRules / CDN) must apply the same
// values; this build has no Nitro layer (Start 1.168 ships a plain server
// entry — Nitro is opt-in and not installed).
function publicDatasetsCacheHeaders(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const pathname = (req.url ?? "").split("?")[0];
    const cacheControl = cacheControlForPath(pathname);
    if (cacheControl) {
      res.setHeader("Cache-Control", cacheControl);
    }
    next();
  };

  return {
    name: "draftspa:public-datasets-cache-headers",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  server: {
    port: 3200,
  },
  resolve: {
    alias: [
      // Framework routing seam: shared components import
      // `@/lib/routing/adapter` (the Next.js implementation). Under Vite,
      // swap in the TanStack Router implementation. Must precede the
      // catch-all `@` alias.
      {
        find: /^@\/lib\/routing\/adapter$/,
        replacement: path.resolve(rootDir, "src/lib/routing/adapter.tanstack.tsx"),
      },
      // @clerk/nextjs can't load outside a Next runtime. The Start build
      // swaps in a local module that re-exports the same surface from
      // @clerk/react (the SDK @clerk/nextjs itself wraps).
      // See src/lib/pro/clerk.tanstack.tsx.
      {
        find: /^@clerk\/nextjs$/,
        replacement: path.resolve(rootDir, "src/lib/pro/clerk.tanstack.tsx"),
      },
      // "server-only" throws outside a react-server bundler condition; the
      // Start server bundle is real server code, so stub the marker.
      // See src/server/serverOnly.tanstack.ts.
      {
        find: /^server-only$/,
        replacement: path.resolve(rootDir, "src/server/serverOnly.tanstack.ts"),
      },
      { find: "@", replacement: path.resolve(rootDir, "src") },
    ],
  },
  plugins: [
    // DraftSpa deliberately avoids server rendering (free-tier hosting):
    // SPA mode prerenders only the root shell; everything renders client-side.
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    viteReact(),
    tailwindcss(),
    publicDatasetsCacheHeaders(),
    // Tidewave dev tooling (MCP endpoint on the dev server). The plugin only
    // registers a configureServer hook, so it is inert in production builds.
    // Server-side log capture is wired in src/start.ts (dev-only import of
    // tidewave/tanstack).
    tidewave(),
  ],
});
