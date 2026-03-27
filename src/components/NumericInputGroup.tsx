import { NumericInput, type NumericIncrement } from "@/components/NumericInput";
import { cx } from "@/components/ui/cx";
import { FieldLabel } from "@/components/ui/FieldLabel";

/* ------------------------------------------------------------------ */
/*  Shared row inside any NumericInputGroup                           */
/* ------------------------------------------------------------------ */

interface NumericInputRowProps {
  /** Short key shown on the left, e.g. "HR" or "SS" */
  label: string;
  /** Accessible description for the numeric input */
  ariaLabel: string;
  value: number;
  onCommit: (value: number) => void;
  increment?: NumericIncrement;
  min?: number;
  max?: number;
  units?: string;
  unitsClassName?: string;
  inputClassName?: string;
  /** className applied to the NumericInput wrapper (controls gap between label/input/units) */
  numericClassName?: string;
  /** className applied to the outer row div */
  className?: string;
}

export function NumericInputRow({
  label,
  ariaLabel,
  value,
  onCommit,
  increment = 1,
  min,
  max,
  units,
  unitsClassName,
  inputClassName,
  numericClassName,
  className,
}: NumericInputRowProps) {
  return (
    <div
      className={cx(
        "flex items-center justify-between gap-3 border-b border-[#111111]/[0.10] py-2.5 last:border-0 dark:border-[#e5e5e5]/[0.08]",
        className
      )}
    >
      <span className="text-sm font-semibold text-[#111111]/65 dark:text-[#e5e5e5]/55">{label}</span>
      <NumericInput
        aria-label={ariaLabel}
        increment={increment}
        min={min}
        max={max}
        value={value}
        onCommit={onCommit}
        units={units}
        unitsClassName={unitsClassName}
        inputClassName={inputClassName ?? "w-10 text-sm"}
        className={numericClassName}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Group wrapper – label bar + rounded background container          */
/* ------------------------------------------------------------------ */

interface NumericInputGroupProps {
  /** Uppercase group label shown above the container */
  label: string;
  children: React.ReactNode;
}

export function NumericInputGroup({ label, children }: NumericInputGroupProps) {
  return (
    <div>
      <FieldLabel className="mb-2 block">{label}</FieldLabel>
      <div className="rounded-lg bg-[#111111]/[0.02] px-3 dark:bg-[#e5e5e5]/[0.03]">
        {children}
      </div>
    </div>
  );
}
