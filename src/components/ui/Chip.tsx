import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChipTone = "neutral" | "accent" | "warning" | "danger";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
  children?: ReactNode;
}

const toneClassNames: Record<ChipTone, string> = {
  neutral:
    "border-[var(--color-border-default)] text-[var(--color-fg-muted)]",
  accent: "border-[var(--color-accent)] text-[var(--color-accent)]",
  warning: "border-[var(--color-warning)] text-[var(--color-warning)]",
  danger: "border-[var(--color-danger)] text-[var(--color-danger)]",
};

/**
 * The Solstice chip — a printed, stamped micro-label with a hairline border.
 * The ONE way to render small bordered tags (sport stamps, status chips,
 * vitals). Square corners, mono uppercase; tone drives border + text color.
 */
export function Chip({ tone = "neutral", className, children, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "font-data inline-flex items-center gap-1 whitespace-nowrap rounded-[var(--radius-sm)] border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
        toneClassNames[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
