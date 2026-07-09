import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/routes/-settings/SettingsPage";

// Legacy /settings?section=… redirect onto the active league's workspace tabs.
export const Route = createFileRoute("/settings")({
  ssr: false,
  component: SettingsPage,
});
