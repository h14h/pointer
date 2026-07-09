import { createFileRoute } from "@tanstack/react-router";
import LeaderboardVisualTestPage from "@/app/(test)/leaderboard-visual/page";

// Visual-regression fixture — same URL and component as the Next.js route
// (src/app/(test)/leaderboard-visual/page.tsx; the (test) group segment does
// not appear in the URL there either).
export const Route = createFileRoute("/leaderboard-visual")({
  ssr: false,
  component: LeaderboardVisualTestPage,
});
