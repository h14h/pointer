"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckboxProps = CheckboxPrimitive.Root.Props;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer relative flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface-base)] text-[var(--color-accent-fg)] outline-none transition-colors focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-[var(--color-accent)] data-checked:bg-[var(--color-accent)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-content-center [&>svg]:size-3">
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
