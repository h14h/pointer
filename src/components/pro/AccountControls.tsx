"use client";

import { SignInButton, UserButton } from "@/lib/pro/clerk";
import { Link } from "@/lib/routing/adapter";
import { Button } from "@/components/ui/Button";
import { isAuthConfigured } from "@/lib/pro/config";
import { usePro } from "@/lib/pro/usePro";

function SignedInControls({ isPro }: { isPro: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {isPro ? (
        <span className="rounded-full border border-[var(--color-accent)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)]">
          Pro
        </span>
      ) : (
        <Link
          href="/pricing"
          className="rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-accent-fg)] transition-opacity hover:opacity-90"
        >
          Go Pro
        </Link>
      )}
      <UserButton />
    </div>
  );
}

function AccountControlsInner() {
  const { isLoaded, isSignedIn, isPro } = usePro();
  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button variant="ghost" size="sm">
          Sign in
        </Button>
      </SignInButton>
    );
  }

  return <SignedInControls isPro={isPro} />;
}

/**
 * Sign-in / account / upgrade controls for the header. Renders nothing when
 * Clerk is not configured, keeping the local-only deployment untouched.
 */
export function AccountControls() {
  if (!isAuthConfigured()) return null;
  return <AccountControlsInner />;
}
