import { createFileRoute } from "@tanstack/react-router";
import { LeagueSurface } from "./-league/LeagueSurface";

// Bare /league/<id> — the workspace with the default (Plan) tab. Tab URLs are
// handled by the sibling splat route (league.$leagueId.$.tsx).
export const Route = createFileRoute("/league/$leagueId/")({
  ssr: false,
  component: LeagueSurface,
});
