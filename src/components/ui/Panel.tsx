import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelTone = "default" | "raised" | "muted" | "accent" | "danger" | "warning";
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
  accent:
    "border border-[color:color-mix(in_srgb,var(--color-accent)_18%,transparent)] bg-[color:color-mix(in_srgb,var(--color-accent)_4%,transparent)]",
  danger:
    "border border-[color:color-mix(in_srgb,var(--color-danger)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--color-danger)_5%,transparent)]",
  warning:
    "border border-[color:color-mix(in_srgb,var(--color-warning)_24%,transparent)] bg-[color:color-mix(in_srgb,var(--color-warning-soft)_8%,transparent)]",
};

const paddingClassNames: Record<PanelPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
};

/**
 * Canonical panel header: stamp title + optional right slot over a hairline
 * rule. Use inside `<Panel padding="none">` so every paneled surface shares
 * one header rhythm.
 */
export function PanelHeader({
  title,
  right,
  className,
}: {
  title: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 border-b border-[var(--color-border-soft)] px-4 py-2.5",
        className
      )}
    >
      <h2 className="stamp">{title}</h2>
      {right ? <div className="flex items-baseline gap-2">{right}</div> : null}
    </div>
  );
}

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
      className={cn(
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
