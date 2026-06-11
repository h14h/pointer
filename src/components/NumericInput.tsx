"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type NumericIncrement = 0.01 | 0.5 | 1;

interface NumericInputProps {
  value: number;
  onCommit: (nextValue: number) => void;
  label?: string;
  labelClassName?: string;
  units?: string;
  unitsClassName?: string;
  increment?: NumericIncrement;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  id?: string;
  "aria-label"?: string;
}

const precisionByIncrement: Record<NumericIncrement, number> = {
  0.01: 2,
  0.5: 1,
  1: 0,
};

function normalizeValue(
  value: number,
  increment: NumericIncrement,
  min?: number,
  max?: number
): number {
  const snapped = Math.round(value / increment) * increment;
  const clampedMin = min === undefined ? snapped : Math.max(min, snapped);
  const clamped = max === undefined ? clampedMin : Math.min(max, clampedMin);
  return Number(clamped.toFixed(precisionByIncrement[increment]));
}

function formatValue(value: number, increment: NumericIncrement): string {
  const text = value.toFixed(precisionByIncrement[increment]);
  return text.endsWith(".0") ? text.slice(0, -2) : text;
}

function parseValue(raw: string): number | null {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function NumericInput({
  value,
  onCommit,
  label,
  labelClassName,
  units,
  unitsClassName,
  increment = 1,
  min,
  max,
  disabled = false,
  className,
  inputClassName,
  id,
  "aria-label": ariaLabel,
}: NumericInputProps) {
  const [draft, setDraft] = useState(() => formatValue(value, increment));

  useEffect(() => {
    setDraft(formatValue(value, increment));
  }, [value, increment]);

  const commit = useCallback(
    (candidate: number) => {
      const normalized = normalizeValue(candidate, increment, min, max);
      setDraft(formatValue(normalized, increment));
      onCommit(normalized);
    },
    [increment, max, min, onCommit]
  );

  const commitDraft = useCallback(() => {
    const parsed = parseValue(draft);
    if (parsed === null) {
      setDraft(formatValue(value, increment));
      return;
    }
    commit(parsed);
  }, [commit, draft, increment, value]);

  const handleStep = useCallback(
    (direction: 1 | -1) => {
      const parsed = parseValue(draft);
      const base = parsed ?? value;
      commit(base + direction * increment);
    },
    [commit, draft, increment, value]
  );

  return (
    <div className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      {label ? (
        <span
          className={cn(
            "shrink-0 text-sm font-semibold tracking-wide text-[var(--color-fg-muted)]",
            labelClassName
          )}
        >
          {label}
        </span>
      ) : null}

      <div className="inline-flex h-9 shrink-0 items-stretch overflow-hidden rounded-sm border border-[var(--color-border-default)] bg-[var(--color-surface-base)]">
        <div className="flex w-7 flex-col border-r border-[var(--color-border-default)]">
          <button
            type="button"
            tabIndex={-1}
            data-numeric-stepper="true"
            aria-label="Increase value"
            disabled={disabled}
            onClick={() => handleStep(1)}
            className="inline-flex h-1/2 items-center justify-center text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-fg-default)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 10 10" aria-hidden="true" className="h-2.5 w-2.5">
              <path d="M1 7L5 3L9 7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button
            type="button"
            tabIndex={-1}
            data-numeric-stepper="true"
            aria-label="Decrease value"
            disabled={disabled}
            onClick={() => handleStep(-1)}
            className="inline-flex h-1/2 items-center justify-center border-t border-[var(--color-border-default)] text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-fg-default)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 10 10" aria-hidden="true" className="h-2.5 w-2.5">
              <path d="M1 3L5 7L9 3" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <input
          id={id}
          type="number"
          data-numeric-input="true"
          aria-label={ariaLabel ?? label ?? units ?? "Numeric input"}
          value={draft}
          min={min}
          max={max}
          step={increment}
          inputMode={increment === 1 ? "numeric" : "decimal"}
          disabled={disabled}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft();
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setDraft(formatValue(value, increment));
              event.currentTarget.select();
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              handleStep(1);
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              handleStep(-1);
            }
          }}
          className={cn(
            "numeric-input-field w-12 border-0 bg-transparent px-2 text-center text-base font-semibold tabular-nums text-[var(--color-fg-default)] outline-none placeholder:text-[var(--color-fg-subtle)] sm:w-14 sm:text-lg",
            inputClassName
          )}
          style={{ fontVariantNumeric: "tabular-nums", MozAppearance: "textfield" }}
        />
      </div>

      {units ? (
        <span
          className={cn(
            "shrink-0 text-sm font-semibold tracking-wide text-[var(--color-fg-muted)]",
            unitsClassName
          )}
        >
          {units}
        </span>
      ) : null}
    </div>
  );
}
