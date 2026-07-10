import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tidewave from "tidewave/vite-plugin";
import {
  defineConfig,
  loadEnv,
  type Connect,
  type Plugin,
  type ServerOptions,
} from "vite";
import { cacheControlForPath } from "./src/lib/publicDatasetsCachePolicy";

// - `bun run dev`   → dev server on :3200 by default (scripts/dev.ts wrapper;
//                     Tidewave overrides host/port/https via flags or env)
// - `bun run build` → production build (dist/client + dist/server)
// - `bun run start` → production server (scripts/serve.ts)
// vitest uses vitest.config.ts.
const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Serving-layer cache headers (see src/lib/publicDatasetsCachePolicy.ts for
// values + rationale):
// - /datasets/*            ← static dataset mirrors
// - /api/public-datasets*  ← API routes (`s-maxage=31536000`)
// Applied in dev AND preview so curl/Playwright observe production headers.
// The production server (scripts/serve.ts → src/server/productionServer.ts)
// applies the same values from the same module.
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

/**
 * Dev-server HTTPS from TIDEWAVE_HTTPS_KEY/TIDEWAVE_HTTPS_CERT (file paths).
 * scripts/dev.ts sets these when it sees the old Next-style
 * `--experimental-https-key/-cert` flags; they can also be exported directly.
 */
function tidewaveHttps(env: NodeJS.ProcessEnv): ServerOptions["https"] | undefined {
  const keyPath = env.TIDEWAVE_HTTPS_KEY;
  const certPath = env.TIDEWAVE_HTTPS_CERT;
  if (!keyPath || !certPath) return undefined;
  return {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  };
}

/**
 * Extra Host headers the dev server should answer (e.g. Tidewave over a
 * tailnet). Comma-separated in ALLOWED_DEV_ORIGINS (see .env.example);
 * `*.domain` wildcards are translated to Vite's `.domain` form.
 */
function allowedDevHosts(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => (origin.startsWith("*.") ? origin.slice(1) : origin));
}

function tidewaveAllowedOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, rootDir, ""), ...process.env };
  const extraHosts = allowedDevHosts(env.ALLOWED_DEV_ORIGINS);
  const allowedTidewaveOrigins = tidewaveAllowedOrigins(
    env.TIDEWAVE_ALLOWED_ORIGINS,
  );
  return {
    server: {
      port: 3200,
      https: tidewaveHttps(env),
      ...(extraHosts.length > 0 ? { allowedHosts: extraHosts } : {}),
    },
    resolve: {
      alias: [{ find: "@", replacement: path.resolve(rootDir, "src") }],
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
      tidewave({
        allowRemoteAccess: env.TIDEWAVE_ALLOW_REMOTE === "true",
        ...(allowedTidewaveOrigins.length > 0
          ? { allowedOrigins: allowedTidewaveOrigins }
          : {}),
      }),
    ],
  };
});
