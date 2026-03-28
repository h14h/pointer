"use client";

import { useSyncExternalStore } from "react";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) return null;

  return (
    <SonnerToaster
      position="bottom-right"
      theme="system"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "border border-[var(--color-border-default)] bg-[var(--color-surface-base)] text-[var(--color-fg-default)] shadow-lg",
          title: "font-sans text-sm font-semibold",
          description: "font-sans text-xs text-[var(--color-fg-muted)]",
          actionButton:
            "rounded-sm bg-[var(--color-accent)] px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-widest text-white",
          cancelButton:
            "rounded-sm border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)]",
        },
      }}
    />
  );
}
