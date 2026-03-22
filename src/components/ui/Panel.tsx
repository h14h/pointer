import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "@/components/ui/cx";

type PanelTone = "default" | "raised" | "muted";
type PanelPadding = "none" | "sm" | "md";

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  tone?: PanelTone;
  padding?: PanelPadding;
  children?: ReactNode;
}

const toneClassNames: Record<PanelTone, string> = {
  default:
    "border border-[var(--color-border-soft)] bg-[var(--color-surface-base)]",
  raised:
    "border border-[var(--color-border-soft)] bg-[var(--color-surface-overlay)] shadow-[var(--shadow-overlay)]",
  muted: "bg-[var(--color-surface-muted)]",
};

const paddingClassNames: Record<PanelPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
};

export function Panel({
  as: Component = "div",
  tone = "default",
  padding = "md",
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <Component
      className={cx(
        "rounded-[var(--radius-lg)]",
        toneClassNames[tone],
        paddingClassNames[padding],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
