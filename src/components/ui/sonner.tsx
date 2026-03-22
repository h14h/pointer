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
            "border border-[#111111]/10 bg-white text-[#111111] shadow-lg dark:border-[#333333] dark:bg-[#111111] dark:text-[#e5e5e5]",
          title: "font-sans text-sm font-semibold",
          description: "font-sans text-xs text-[#111111]/60 dark:text-[#e5e5e5]/50",
          actionButton:
            "rounded-sm bg-[var(--color-accent)] px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-widest text-white",
          cancelButton:
            "rounded-sm border border-[#111111]/15 bg-transparent px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 dark:border-[#333333] dark:text-[#e5e5e5]/55",
        },
      }}
    />
  );
}
