import type { ReactNode } from "react";
import { Link } from "@/lib/routing/adapter";
import { PageContainer } from "@/components/ui/PageContainer";
import { Wordmark } from "./Wordmark";

/**
 * The standard top-of-page brand bar: wordmark (home link) on the left, a
 * free-form right slot (account controls, stamps). One owner for the h-14 +
 * hairline-rule header every day surface shares.
 */
export function BrandBar({ right }: { right?: ReactNode }) {
  return (
    <header className="border-b border-[var(--color-border-soft)]">
      <PageContainer className="flex h-14 items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <Wordmark tagline />
        </Link>
        {right}
      </PageContainer>
    </header>
  );
}
