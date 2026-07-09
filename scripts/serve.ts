// Production server entry: `bun run start` (after `bun run build`).
//
// Serves dist/client statics + the prerendered SPA shell and delegates the
// API server routes to the built Start fetch handler, applying the locked
// cache policies at the serving layer. All routing/caching logic lives in
// src/server/productionServer.ts (unit-tested); this file only wires it to
// Bun.serve.
//
// Env: PORT (default 3000), HOSTNAME (default 0.0.0.0).

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createProductionRequestHandler } from "../src/server/productionServer";

// Bun runtime API (this entry requires bun; the handler itself is runtime
// agnostic). Declared locally instead of depending on @types/bun so the
// shared TS program stays on @types/node.
declare const Bun: {
  serve(options: {
    port: number;
    hostname: string;
    fetch(request: Request): Response | Promise<Response>;
  }): { port: number; hostname: string };
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const serverEntry = pathToFileURL(path.join(distDir, "server", "server.js")).href;

const { default: ssrEntry } = (await import(serverEntry)) as {
  default: { fetch(request: Request): Response | Promise<Response> };
};

const handler = createProductionRequestHandler({
  clientDir: path.join(distDir, "client"),
  ssrFetch: (request) => ssrEntry.fetch(request),
});

const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

Bun.serve({ port, hostname, fetch: handler });

console.log(`DraftSpa production server listening on http://${hostname}:${port}`);
