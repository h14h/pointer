/// <reference types="vite/client" />

declare module "*.css?url" {
  const href: string;
  export default href;
}

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_CONVEX_URL?: string;
  readonly VITE_POLAR_PRODUCT_ID?: string;
}
