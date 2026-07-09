import { createFileRoute } from "@tanstack/react-router";
import PricingPage from "@/app/pricing/page";

// Same component as the Next.js route (src/app/pricing/page.tsx).
export const Route = createFileRoute("/pricing")({
  ssr: false,
  component: PricingPage,
});
