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
          "flex items-center gap-2 rounded-full border border-[#111111]/12 bg-[#111111]/[0.03] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#111111]/68 transition hover:bg-[#111111]/[0.05] dark:border-[#e5e5e5]/10 dark:bg-[#e5e5e5]/[0.04] dark:text-[#e5e5e5]/64 dark:hover:bg-[#e5e5e5]/[0.07]",
          fullWidth ? "w-full" : "",
          triggerClassName
        )}
      >
        {label ? (
          <span className="shrink-0 text-[#111111]/42 dark:text-[#e5e5e5]/38">{label}</span>
        ) : null}
        <span className="min-w-0 flex-1 truncate text-[#111111]/80 dark:text-[#e5e5e5]/78">
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
              "absolute top-full z-50 mt-1 rounded-2xl border border-[#111111]/15 bg-white shadow-lg dark:border-[#333333] dark:bg-[#1a1a1a]",
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
