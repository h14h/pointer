import { NumericInput, type NumericIncrement } from "@/components/NumericInput";
import { cn } from "@/lib/utils";
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
      className={cn(
        "flex items-center justify-between gap-3 border-b border-[var(--color-border-soft)] py-2.5 last:border-0",
        className
      )}
    >
      <span className="text-sm font-semibold text-[var(--color-fg-muted)]">{label}</span>
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
      <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] px-3">
        {children}
      </div>
    </div>
  );
}
