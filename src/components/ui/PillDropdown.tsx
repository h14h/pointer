import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export interface PillDropdownProps {
  value: ReactNode;
  menu: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  label?: ReactNode;
  ariaLabel?: string;
  align?: "left" | "right";
  fullWidth?: boolean;
  triggerClassName?: string;
  menuClassName?: string;
}

export function PillDropdown({
  value,
  menu,
  isOpen,
  onToggle,
  onClose,
  label,
  ariaLabel,
  align = "left",
  fullWidth = false,
  triggerClassName,
  menuClassName,
}: PillDropdownProps) {
  return (
    <div className={cx("relative", fullWidth ? "min-w-0 flex-1" : "")}>
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={cx(
          "flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-fg-muted)] transition hover:bg-[var(--color-surface-hover)]",
          fullWidth ? "w-full" : "",
          triggerClassName
        )}
      >
        {label ? (
          <span className="shrink-0 text-[var(--color-fg-subtle)]">{label}</span>
        ) : null}
        <span className="min-w-0 flex-1 truncate text-[var(--color-fg-default)]">
          {value}
        </span>
        <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5 shrink-0" aria-hidden="true">
          <path d="M2.5 4.5l3.5 3.5 3.5-3.5" />
        </svg>
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="Close dropdown"
            className="fixed inset-0 z-40 cursor-default"
            onClick={onClose}
          />
          <div
            className={cx(
              "absolute top-full z-50 mt-1 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-overlay)] shadow-lg",
              fullWidth ? "left-0 right-0" : align === "right" ? "right-0" : "left-0",
              menuClassName
            )}
          >
            {menu}
          </div>
        </>
      ) : null}
    </div>
  );
}
