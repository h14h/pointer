import { createFileRoute, Navigate } from "@tanstack/react-router";

// /league (and /league/) name no league — client-redirect to the home league
// list, matching the Next.js shell's behavior for an id-less league URL.
//
// Deliberately a render-time <Navigate>, NOT `beforeLoad: throw redirect(...)`:
// in SPA mode the prerendered/dev-rendered shell contains only the root route
// with an empty (pending) suspense boundary, and router-core's hydration guard
// (`_displayPending` in @tanstack/router-core ssr-client) pins the FIRST match
// below root as pending so React's hydration render matches that empty shell.
// A beforeLoad redirect runs inside the pre-hydration `router.load()`, swaps
// the match set to "/" (dropping the pinned match), and lets the "/" content
// render DURING hydration — a hydration mismatch on every direct /league load
// (GitHub issue #27). <Navigate> renders null (matching the empty shell) and
// performs the same replace-navigation in an effect after hydration.
export const Route = createFileRoute("/league/")({
  ssr: false,
  component: () => <Navigate to="/" replace />,
});
