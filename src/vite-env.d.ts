// Minimal Vite asset typings for files shared between the Next.js and
// TanStack Start builds. Deliberately NOT `/// <reference types="vite/client" />`
// — pulling vite/client's global module declarations into the one shared TS
// program could fight Next's own asset typings.

declare module "*.css?url" {
  const href: string;
  export default href;
}
