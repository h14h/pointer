import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface LedgerRowProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children?: ReactNode;
}

/**
 * One line of a Solstice ledger — the hairline-separated row idiom used by
 * rosters, wires, targets, tier tables, and source lists. Owns the rule and
 * the rhythm; columns are free-form children (typically font-data).
 */
export function LedgerRow({
  as: Component = "div",
  className,
  children,
  ...props
}: LedgerRowProps) {
  return (
    <Component
      className={cn(
        "flex items-baseline gap-3 border-b border-[var(--color-border-soft)] px-4 py-1.5 last:border-b-0",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
