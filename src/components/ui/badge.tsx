import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "neutral"
  | "accent"
  | "danger"
  | "muted"
  | "count"
  | "ownershipDrafted"
  | "ownershipKeeper";
type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantClassNames: Record<BadgeVariant, string> = {
  neutral:
    "border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] text-[var(--color-fg-muted)]",
  accent:
    "border-[color:color-mix(in_srgb,var(--color-accent)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--color-accent)_8%,transparent)] text-[var(--color-accent)]",
  danger:
    "border-[color:color-mix(in_srgb,var(--color-danger)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--color-danger)_8%,transparent)] text-[var(--color-danger)]",
  muted:
    "border-transparent bg-[var(--color-surface-muted)] text-[var(--color-fg-subtle)]",
  count: "border-transparent bg-[var(--color-accent)] text-[var(--color-accent-fg)]",
  ownershipDrafted:
    "border-[var(--color-border-default)] bg-[var(--color-surface-muted)] text-[var(--color-fg-muted)]",
  ownershipKeeper:
    "border-[color:color-mix(in_srgb,var(--color-accent)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--color-accent)_5%,transparent)] text-[color:color-mix(in_srgb,var(--color-accent)_85%,black_15%)]",
};

const sizeClassNames: Record<BadgeSize, string> = {
  sm: "rounded-full px-2 py-1 text-[10px] tracking-widest",
  md: "rounded-full px-2.5 py-1 text-[10px] tracking-widest",
};

export function Badge({
  className,
  variant = "neutral",
  size = "sm",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex select-none items-center justify-center border font-sans font-bold uppercase",
        sizeClassNames[size],
        variantClassNames[variant],
        className
      )}
      {...props}
    />
  );
}
