"use client";

import Link from "next/link";
import { PricingTable } from "@clerk/nextjs";
import { BrandBar } from "@/components/brand/BrandBar";
import { AccountControls } from "@/components/pro/AccountControls";
import { PageContainer } from "@/components/ui/PageContainer";
import { Panel } from "@/components/ui/Panel";
import { isAuthConfigured, isCloudConfigured } from "@/lib/pro/config";

const proFeatures = [
  "Cloud backup for all of your leagues",
  "Multi-device sync — track your draft on a laptop, watch it update on your phone",
  "Unlimited baseball and football leagues, available everywhere you sign in",
  "Priority access to upcoming Pro features (premium projections, player overrides)",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <BrandBar right={<AccountControls />} />
      <main className="py-6 sm:py-8">
        <PageContainer>
          <span className="stamp">go pro</span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-fg-default)]">
            DraftSpa Pro
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--color-fg-muted)]">
            The core draft workspace is free, forever, right in your browser.
            Pro adds the features that need a server: cloud storage and live
            sync across devices.
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
            {isAuthConfigured() && isCloudConfigured() ? (
              <PricingTable />
            ) : (
              <Panel tone="muted" padding="md" className="rounded-lg text-sm text-[var(--color-fg-muted)]">
                Pro subscriptions aren&apos;t configured on this deployment yet. See{" "}
                <code className="font-mono text-xs">docs/monetization.md</code> for the
                Clerk + Convex setup guide.
              </Panel>
            )}
          </div>

          <p className="mt-8 text-xs text-[var(--color-fg-subtle)]">
            <Link href="/" className="underline hover:text-[var(--color-fg-muted)]">
              ← Back to leagues
            </Link>
          </p>
        </PageContainer>
      </main>
    </div>
  );
}
