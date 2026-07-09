import { createFileRoute } from "@tanstack/react-router";
import SettingsPage from "@/app/settings/page";

// Legacy /settings?section=… redirect — same component as the Next.js route
// (src/app/settings/page.tsx), Suspense boundary and all.
export const Route = createFileRoute("/settings")({
  ssr: false,
  component: SettingsPage,
});
