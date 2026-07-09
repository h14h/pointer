import { createFileRoute } from "@tanstack/react-router";
import { LeaderboardVisualTestPage } from "@/routes/-leaderboard-visual/LeaderboardVisualTestPage";

// Visual-regression fixture — renders the Leaderboard with deterministic data
// for the Playwright screenshot suite. Not linked in the production UI.
export const Route = createFileRoute("/leaderboard-visual")({
  ssr: false,
  component: LeaderboardVisualTestPage,
});
