import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export interface FieldLabelProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

export function FieldLabel({ className, children, ...props }: FieldLabelProps) {
  return (
    <span
      className={cx(
        "text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
