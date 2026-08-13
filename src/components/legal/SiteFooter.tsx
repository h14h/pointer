import { Link } from "@/lib/routing/adapter";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-border-soft)] py-6">
      <div className="mx-auto flex w-full max-w-[var(--width-page)] flex-wrap items-center justify-between gap-3 px-[var(--space-page-x)] text-xs text-[var(--color-fg-subtle)] sm:px-[var(--space-page-x-sm)]">
        <p>DraftSpa · fantasy draft workspace</p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/pricing" className="hover:text-[var(--color-fg-muted)]">
            Pro
          </Link>
          <Link href="/support" className="hover:text-[var(--color-fg-muted)]">
            Support
          </Link>
          <Link href="/privacy" className="hover:text-[var(--color-fg-muted)]">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[var(--color-fg-muted)]">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
