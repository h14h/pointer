import type { ReactNode } from "react";
import { BrandBar } from "@/components/brand/BrandBar";
import { AccountControls } from "@/components/pro/AccountControls";
import { PageContainer } from "@/components/ui/PageContainer";
import { SiteFooter } from "./SiteFooter";

export function LegalPage({
  stamp,
  title,
  children,
}: {
  stamp: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <BrandBar right={<AccountControls />} />
      <PageContainer as="main" className="max-w-2xl py-8">
        <span className="stamp">{stamp}</span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-fg-default)]">
          {title}
        </h1>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--color-fg-muted)]">
          {children}
        </div>
      </PageContainer>
      <SiteFooter />
    </div>
  );
}
