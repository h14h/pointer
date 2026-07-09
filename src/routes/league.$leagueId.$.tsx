import { createFileRoute } from "@tanstack/react-router";
import { LeagueSurface } from "./-league/LeagueSurface";

// /league/<id>/<anything...> — a splat, NOT a typed $tab param, on purpose:
// the URL contract (src/test/contracts/leagueRoutes/fixtures.ts) requires
// unknown/case-mismatched tab segments to silently render Plan and extra
// segments after a valid tab to be ignored, never 404. The splat accepts any
// suffix; useLeagueParams (routing seam) reads the first segment and falls
// back to "plan" unless it exactly matches a tab or "draft".
export const Route = createFileRoute("/league/$leagueId/$")({
  ssr: false,
  component: LeagueSurface,
});
