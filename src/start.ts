import { createStart } from "@tanstack/react-start";

// Tidewave dev tooling for TanStack Start (per tidewave@0.6 docs): the Vite
// plugin in vite.config.ts serves the /tidewave MCP endpoint on the dev
// server, and this dev-only, server-only import patches console so server
// logs reach the Tidewave logger. Production builds never execute it.
//
// Note: unlike the Next.js side (src/instrumentation.ts, which feeds Tidewave
// via OpenTelemetry span/log processors under a NodeSDK), the Start
// integration does not use OTel. The Next NodeSDK carries no processors
// outside development, so there is nothing to port for production; if real
// OTel exporters are ever added, bootstrap them here (server-side) instead.
if (process.env.NODE_ENV === "development" && typeof window === "undefined") {
  import("tidewave/tanstack");
}

export const startInstance = createStart(() => {
  return {};
});
