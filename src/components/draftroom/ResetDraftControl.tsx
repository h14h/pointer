"use client";

import { useState } from "react";
import { AppDialog } from "@/components/ui/AppDialog";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/store";

/**
 * The canonical draft reset — it lives in the draft room because resetting is
 * a draft-day operation (your real draft restarted, or you're running it
 * back). Clears every logged pick and the wire; keepers stay in their rounds.
 */
export function ResetDraftControl({ className }: { className?: string }) {
  const resetDraft = useStore((state) => state.resetDraft);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ??
          "font-data cursor-pointer self-start text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)] underline decoration-[var(--color-border-default)] underline-offset-4 hover:text-[var(--color-warning)] hover:decoration-[var(--color-warning)]"
        }
      >
        reset draft
      </button>

      <AppDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        tone="destructive"
        title="Reset all draft picks?"
        description="Every logged pick and the wire are cleared, and the clock returns to pick №1. Keeper assignments stay in their rounds, and your targets and notes are untouched."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetDraft();
                setIsOpen(false);
              }}
            >
              Reset Draft
            </Button>
          </>
        }
      />
    </>
  );
}
