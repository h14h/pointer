import type { NextConfig } from "next";

// Comma-separated hostnames allowed to load /_next/* from this dev server
// (e.g. Tidewave on a tailnet host). See .env.example. Dev-only; never
// put machine-specific hostnames/IPs in committed config.
const allowedDevOrigins =
  process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  // Playwright's webServer sets this to keep its build output out of the
  // .next dir a live dev server owns — two Next instances sharing one
  // .next contend for the dev build lock and hang the older instance.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  experimental: {
    // The league routes are dynamic ([id]) but render pure client shells —
    // let the client router reuse their RSC payloads for 5 minutes so tab
    // switching doesn't re-hit the server on every click (anonymous usage
    // must stay near-zero server load after initial load).
    staleTimes: {
      dynamic: 300,
      static: 300,
    },
  },
  async rewrites() {
    return {
      afterFiles: [
        {
          // Every league URL serves the ONE prerendered shell page; the
          // league id and tab are derived client-side from the browser URL.
          // This keeps the whole prep/draft experience a static asset —
          // no on-demand server rendering for /league/* (free-tier rule).
          source: "/league/:path*",
          destination: "/league-shell",
        },
      ],
    };
  },
  async headers() {
    return [
      {
        // Public projection datasets are static assets (see
        // scripts/generate-public-dataset.ts, which mirrors them here).
        // A day of browser cache + a week of stale-while-revalidate keeps
        // repeat visitors and bots off the server without freezing updates.
        source: "/datasets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
