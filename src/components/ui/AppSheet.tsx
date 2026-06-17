"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface AppSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function AppSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = "right",
  className,
}: AppSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "w-[min(22rem,calc(100vw-1.5rem))] border-[var(--color-border-soft)] bg-[var(--color-surface-overlay)] shadow-[var(--shadow-overlay)]",
          className
        )}
      >
        <SheetHeader className="border-b border-[var(--color-border-soft)] px-5 pb-4 pt-5">
          <div className="stamp">DraftSpa</div>
          <SheetTitle className="mt-2 text-lg font-bold text-[var(--color-fg-default)]" style={{ fontFamily: "var(--font-title)" }}>
            {title}
          </SheetTitle>
          {description ? (
            <SheetDescription className="text-sm text-[var(--color-fg-muted)]">
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4 font-sans">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
