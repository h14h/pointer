/**
 * Framework-agnostic site metadata.
 *
 * Plain constants with no Next.js imports so the same values can feed
 * Next's `metadata` export today and any other framework's head/meta
 * API (e.g. TanStack Start) later.
 */
export const siteMetadata = {
  title: "DraftSpa — fantasy draft workspace",
  description:
    "Build league-specific rankings, plan targets by round, and track every pick from one focused workspace.",
} as const;
