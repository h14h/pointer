import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/components/ui/cx";

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

const thumbClassNames: Record<ToggleSize, string> = {
  sm: "h-3 w-3 rounded-sm",
  md: "absolute top-0.5 h-[22px] w-[22px] rounded-full",
};

const thumbCheckedClassNames: Record<ToggleSize, string> = {
  sm: "translate-x-6 bg-white",
  md: "translate-x-[22px] bg-white dark:bg-[#f5f5f5]",
};

const thumbUncheckedClassNames: Record<ToggleSize, string> = {
  sm: "translate-x-1 bg-[#111111]/40 dark:bg-[#e5e5e5]/40",
  md: "translate-x-0.5 bg-white dark:bg-[#f5f5f5]",
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
      className={cx(
        "relative inline-flex items-center transition-colors",
        trackClassNames[size],
        size === "sm"
          ? checked
            ? "border-[#dc2626] dark:border-[#ef4444] bg-[#dc2626] dark:bg-[#ef4444]"
            : "border-[#111111]/30 dark:border-[#333333] bg-transparent"
          : checked
            ? "border-[#dc2626]/60 bg-[#dc2626]"
            : "border-[#111111]/15 bg-white/80 dark:border-[#e5e5e5]/15 dark:bg-[#1f1f1f]",
        disabled ? "cursor-not-allowed opacity-60" : "",
        className
      )}
      {...props}
    >
      <span
        className={cx(
          "inline-block transform transition-transform shadow-sm",
          thumbClassNames[size],
          checked ? thumbCheckedClassNames[size] : thumbUncheckedClassNames[size]
        )}
      />
    </button>
  );
}
