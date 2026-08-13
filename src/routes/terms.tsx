import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/terms")({
  ssr: false,
  component: Page,
});

function Page() {
  return (
    <LegalPage stamp="stub" title="Terms of use">
      <p>
        This is a placeholder. DraftSpa is a draft workspace that currently
        stores your leagues in this browser unless you subscribe to Pro cloud
        backup. We will replace this page with terms we actually stand behind
        before charging for Pro.
      </p>
      <p>By using the free workspace, you agree not to abuse the service.</p>
    </LegalPage>
  );
}
