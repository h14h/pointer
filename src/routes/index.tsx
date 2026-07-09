import { createFileRoute } from "@tanstack/react-router";
import Home from "@/app/page";

// DraftSpa home — same component the Next.js route (src/app/page.tsx) renders.
export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});
