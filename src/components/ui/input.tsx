import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

type InputTone = "default" | "subtle" | "danger";
type InputSize = "sm" | "md";

export interface InputProps extends React.ComponentProps<"input"> {
  tone?: InputTone;
  inputSize?: InputSize;
}

const toneClassNames: Record<InputTone, string> = {
  default:
    "border-[var(--color-border-default)] bg-[var(--color-surface-base)] text-[var(--color-fg-default)] placeholder:text-[var(--color-fg-subtle)] focus-visible:border-[var(--color-accent)] focus-visible:ring-[var(--color-focus-ring)]",
  subtle:
    "border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] text-[var(--color-fg-default)] placeholder:text-[var(--color-fg-subtle)] focus-visible:border-[var(--color-accent)] focus-visible:ring-[var(--color-focus-ring)]",
  danger:
    "border-[color:color-mix(in_srgb,var(--color-danger)_24%,transparent)] bg-[color:color-mix(in_srgb,var(--color-danger)_5%,var(--color-surface-base))] text-[var(--color-fg-default)] placeholder:text-[var(--color-fg-subtle)] focus-visible:border-[var(--color-danger)] focus-visible:ring-[color:color-mix(in_srgb,var(--color-danger)_28%,transparent)]",
};

const sizeClassNames: Record<InputSize, string> = {
  sm: "h-8 px-3 py-1.5 text-sm",
  md: "h-9 px-3 py-2 text-sm",
};

export function Input({
  className,
  tone = "default",
  inputSize = "md",
  type,
  ...props
}: InputProps) {
  return (
    <InputPrimitive
      type={type}
      className={cn(
        "w-full min-w-0 rounded-sm border font-sans shadow-none outline-none ring-0 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[var(--color-surface-base)]",
        sizeClassNames[inputSize],
        toneClassNames[tone],
        className
      )}
      {...props}
    />
  );
}
