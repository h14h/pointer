import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/components/ui/cx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "destructiveGhost";
type ButtonSize = "sm" | "md" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

const baseClassName =
  "inline-flex items-center justify-center gap-2 rounded-sm font-sans text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]",
  secondary:
    "border border-[var(--color-border-default)] bg-[var(--color-surface-base)] text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-fg-default)] dark:bg-[var(--color-surface-base)]",
  ghost:
    "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-fg-default)]",
  destructive:
    "bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger-hover)]",
  destructiveGhost:
    "text-[var(--color-danger)] hover:bg-red-50 dark:text-[#ef4444] dark:hover:bg-red-950/30",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1.5",
  md: "min-h-9 px-4 py-2",
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
      className={cx(baseClassName, variantClassNames[variant], sizeClassNames[size], className)}
      {...props}
    />
  );
}
