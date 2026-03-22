import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";

export interface DialogShellProps {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  labelledBy: string;
  closeLabel?: string;
}

export function DialogShell({
  title,
  description,
  children,
  footer,
  onClose,
  labelledBy,
  closeLabel = "Close dialog",
}: DialogShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-backdrop)]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cx(
          "relative mx-0 h-full w-full max-w-none overflow-y-auto border border-[var(--color-border-soft)] bg-[var(--color-surface-overlay)] p-8 sm:mx-4 sm:h-auto sm:max-w-md",
          "border-l-4 border-l-[var(--color-danger)] rounded-none sm:rounded-[var(--radius-sm)]"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute right-4 top-4 text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-default)]"
        >
          <span className="text-xl leading-none font-sans">&times;</span>
        </Button>
        <h2
          id={labelledBy}
          className="mb-3 pr-10 text-xl font-bold text-[var(--color-fg-default)]"
          style={{ fontFamily: "var(--font-title)" }}
        >
          {title}
        </h2>
        {description ? (
          <p className="mb-8 text-sm leading-relaxed text-[var(--color-fg-muted)]">
            {description}
          </p>
        ) : null}
        {children}
        {footer ? <div className="mt-8 flex justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}
