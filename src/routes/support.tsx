import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/support")({
  ssr: false,
  component: Page,
});

function Page() {
  return (
    <LegalPage stamp="stub" title="Support">
      <p>
        Support inbox coming. For now this page is a stub — we have not
        published a contact address yet.
      </p>
      <p>
        If something is broken in the draft workspace, export a backup from
        the leagues page so you do not lose a draft night.
      </p>
    </LegalPage>
  );
}
