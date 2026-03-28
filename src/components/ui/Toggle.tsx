import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ToggleSize = "sm" | "md";

export interface ToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "role" | "aria-checked"> {
  checked: boolean;
  size?: ToggleSize;
}

const trackClassNames: Record<ToggleSize, string> = {
  sm: "h-5 w-10 rounded-sm border",
  md: "h-7 w-12 rounded-full border",
};

const trackCheckedClassNames: Record<ToggleSize, string> = {
  sm: "border-[var(--color-accent)] bg-[var(--color-accent)]",
  md: "border-[color:color-mix(in_srgb,var(--color-accent)_60%,transparent)] bg-[var(--color-accent)]",
};

const trackUncheckedClassNames: Record<ToggleSize, string> = {
  sm: "border-[var(--color-border-default)] bg-transparent",
  md: "border-[var(--color-border-soft)] bg-[var(--color-surface-base)]",
};

const thumbClassNames: Record<ToggleSize, string> = {
  sm: "h-3 w-3 rounded-sm",
  md: "absolute top-0.5 h-[22px] w-[22px] rounded-full",
};

const thumbCheckedClassNames: Record<ToggleSize, string> = {
  sm: "translate-x-6 bg-white",
  md: "translate-x-[22px] bg-white",
};

const thumbUncheckedClassNames: Record<ToggleSize, string> = {
  sm: "translate-x-1 bg-[var(--color-fg-default)]/40",
  md: "translate-x-0.5 bg-white",
};

export function Toggle({
  checked,
  size = "sm",
  className,
  disabled,
  type = "button",
  ...props
}: ToggleProps) {
  return (
    <button
      type={type}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cn(
        "relative inline-flex items-center transition-colors",
        trackClassNames[size],
        checked ? trackCheckedClassNames[size] : trackUncheckedClassNames[size],
        disabled ? "cursor-not-allowed opacity-60" : "",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-block transform transition-transform shadow-sm",
          thumbClassNames[size],
          checked ? thumbCheckedClassNames[size] : thumbUncheckedClassNames[size]
        )}
      />
    </button>
  );
}
