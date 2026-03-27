"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AppDialogTone = "default" | "destructive";

export interface AppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  tone?: AppDialogTone;
  className?: string;
  contentClassName?: string;
}

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  tone = "default",
  className,
  contentClassName,
}: AppDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-none border border-[var(--color-border-soft)] bg-[var(--color-surface-overlay)] p-6 font-sans shadow-[var(--shadow-overlay)] sm:rounded-[var(--radius-sm)] sm:p-8",
          tone === "destructive"
            ? "border-l-4 border-l-[var(--color-danger)]"
            : "border-l-4 border-l-[var(--color-accent)]",
          contentClassName
        )}
      >
        <DialogHeader className={cn("gap-3 pr-10", className)}>
          <DialogTitle className="text-xl font-bold text-[var(--color-fg-default)]" style={{ fontFamily: "var(--font-title)" }}>
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-sm leading-relaxed text-[var(--color-fg-muted)]">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
        {footer ? (
          <DialogFooter className="-mx-0 -mb-0 mt-8 rounded-none border-0 bg-transparent p-0">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
