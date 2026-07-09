import { createFileRoute } from "@tanstack/react-router";
import { FleetPage } from "@/components/fleet/FleetPage";

// DraftSpa home: each league card opens its workspace or live draft tracker.
export const Route = createFileRoute("/")({
  ssr: false,
  component: FleetPage,
});
