import { createFileRoute, redirect } from "@tanstack/react-router";

// /league (and /league/) name no league — client-redirect to the home league
// list, matching the Next.js shell's behavior for an id-less league URL.
export const Route = createFileRoute("/league/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
