/// <reference types="vite/client" />

// vite/client's asset modules don't cover query-suffixed imports.
declare module "*.css?url" {
  const href: string;
  export default href;
}

// Public build-time env (inlined by Vite; see src/lib/pro/config.ts).
interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_CONVEX_URL?: string;
}
