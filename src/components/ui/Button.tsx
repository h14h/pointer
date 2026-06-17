import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "destructiveGhost"
  | "toolbar"
  | "toolbarActive"
  | "toolbarDanger"
  | "iconSubtle"
  | "inverse";
type ButtonSize = "sm" | "md" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

const baseClassName =
  "inline-flex items-center justify-center gap-2 rounded-sm font-sans text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)]",
  secondary:
    "border border-[var(--color-border-default)] bg-[var(--color-surface-base)] text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-fg-default)]",
  ghost:
    "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-fg-default)]",
  destructive:
    "bg-[var(--color-danger)] text-[var(--color-danger-fg)] hover:bg-[var(--color-danger-hover)]",
  destructiveGhost:
    "text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]",
  toolbar:
    "border border-[var(--color-border-default)] bg-[var(--color-surface-base)] text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-fg-default)]",
  toolbarActive:
    "border border-[color:color-mix(in_srgb,var(--color-accent)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--color-accent)_5%,transparent)] text-[var(--color-accent)] hover:bg-[color:color-mix(in_srgb,var(--color-accent)_8%,transparent)]",
  toolbarDanger:
    "border border-[color:color-mix(in_srgb,var(--color-danger)_22%,transparent)] text-[var(--color-danger)] hover:bg-[color:color-mix(in_srgb,var(--color-danger)_6%,transparent)]",
  iconSubtle:
    "border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-fg-default)]",
  // The ink-filled brand CTA used for live draft entry. Inverse tokens flip
  // with the active theme.
  inverse:
    "bg-[var(--color-inverse-bg)] text-[var(--color-inverse-fg)] hover:opacity-90",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "min-h-8 min-w-[4.5rem] max-w-xs px-3 py-1.5",
  md: "min-h-9 min-w-[5rem] max-w-xs px-4 py-2",
  icon: "h-8 w-8 p-0 tracking-normal",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(baseClassName, variantClassNames[variant], sizeClassNames[size], className)}
      {...props}
    />
  );
}
