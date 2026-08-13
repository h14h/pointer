import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/privacy")({
  ssr: false,
  component: Page,
});

function Page() {
  return (
    <LegalPage stamp="stub" title="Privacy">
      <p>
        This is a placeholder privacy notice. Free DraftSpa keeps league data
        in your browser (IndexedDB). We do not receive that data unless you
        turn on Pro cloud backup.
      </p>
      <p>
        When Pro is live, cloud copies live on our Convex project so you can
        sync devices. We will update this page with a real policy before we
        take payment.
      </p>
    </LegalPage>
  );
}
