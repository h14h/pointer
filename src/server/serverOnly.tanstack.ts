// Vite stand-in for the "server-only" marker package (see vite.config.ts).
//
// "server-only" only exports an empty module under the bundler condition
// "react-server"; its default entry throws at import time. Next.js resolves
// the react-server condition for server code, but the TanStack Start server
// bundle (plain Vite SSR) hits the throwing default entry. The Start server
// environment is legitimately server-side, so alias the package to this empty
// module there. Client-side imports of server modules still fail loudly —
// they'd break on node:fs/aws-sdk imports long before this marker matters.
export {};
