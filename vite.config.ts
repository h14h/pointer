import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// TanStack Start build (coexists with Next.js until cutover).
// - `bun run dev:start`   → dev server on :3200 (3000/3099 belong to Next)
// - `bun run build:start` → production build
// Next.js never reads this file; vitest uses vitest.config.ts.
const rootDir = path.dirname(fileURLToPath(import.meta.url));

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
  ],
});
