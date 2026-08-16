import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/lib/routing/adapter";
import { BrandBar } from "@/components/brand/BrandBar";
import { AccountControls } from "@/components/pro/AccountControls";
import { CheckoutButton } from "@/components/pro/CheckoutButton";
import { SiteFooter } from "@/components/legal/SiteFooter";
import { PageContainer } from "@/components/ui/PageContainer";
import { Panel } from "@/components/ui/Panel";
import { isAuthConfigured, isPaymentsConfigured } from "@/lib/pro/config";
import { usePro } from "@/lib/pro/usePro";

export const Route = createFileRoute("/pricing")({
  ssr: false,
  component: PricingPage,
});

const proFeatures = [
  "Cloud backup for all of your leagues",
  "Multi-device sync — track your draft on a laptop, watch it update on your phone",
  "Unlimited baseball and football leagues, available everywhere you sign in",
];

function PaymentsStub({ signedIn }: { signedIn?: boolean }) {
  return (
    <Panel tone="muted" padding="md" className="rounded-lg text-sm text-[var(--color-fg-muted)]">
      <p>
        Payments are not live on this build. We are not taking cards here.
        Founding Pro will be $10 this season for cloud backup and live sync.
      </p>
      {signedIn ? (
        <p className="mt-2">
          You&apos;re signed in. Your leagues still live only in this browser
          until Pro checkout is on.
        </p>
      ) : (
        <p className="mt-2">The draft workspace stays free in this browser.</p>
      )}
    </Panel>
  );
}

function PricingInner() {
  const paymentsLive = isPaymentsConfigured();
  const { isLoaded, isSignedIn, isPro } = usePro();

  if (!isLoaded) return null;
  if (!paymentsLive) return <PaymentsStub signedIn={isSignedIn} />;

  if (isPro) {
    return (
      <Panel tone="muted" padding="md" className="rounded-lg text-sm text-[var(--color-fg-default)]">
        You&apos;re on Founding Pro. Cloud backup and live sync are on for this
        account.
      </Panel>
    );
  }

  if (!isSignedIn) {
    return (
      <Panel tone="muted" padding="md" className="rounded-lg text-sm text-[var(--color-fg-muted)]">
        Sign in to buy Founding Pro — $10 this season for cloud backup and live
        sync. Until then, your leagues stay in this browser only.
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-fg-muted)]">
        You&apos;re signed in, but still on the free local workspace. Founding
        Pro ($10 this season) turns on cloud backup and live sync — not a
        countdown sale.
      </p>
      <CheckoutButton />
    </div>
  );
}

function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <BrandBar right={<AccountControls />} />
      <main className="py-6 sm:py-8">
        <PageContainer>
          <span className="stamp">founding pro</span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-fg-default)]">
            DraftSpa Pro
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--color-fg-muted)]">
            The core draft workspace is free, forever, right in your browser.
            Founding Pro is $10 this season for cloud backup and live sync.
            That is this season&apos;s rate — not a countdown sale.
          </p>

          <ul className="mt-6 grid max-w-xl gap-2 text-sm text-[var(--color-fg-default)]">
            {proFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--color-accent)]">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-8 max-w-2xl">
            {isAuthConfigured() ? <PricingInner /> : <PaymentsStub />}
          </div>

          <p className="mt-8 text-xs text-[var(--color-fg-subtle)]">
            <Link href="/" className="underline hover:text-[var(--color-fg-muted)]">
              ← Back to leagues
            </Link>
          </p>
        </PageContainer>
      </main>
      <SiteFooter />
    </div>
  );
}
