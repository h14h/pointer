"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Types
   --------------------------------------------------------------------------- */

export interface DropdownOption<T extends string | number> {
  value: T;
  label: string;
  description?: string;
}

type DropdownPlacement =
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right";

export interface DropdownItemContext<T extends string | number> {
  isSelected: boolean;
  value: T;
  close: () => void;
}

/* ---------------------------------------------------------------------------
   Props — discriminated union
   --------------------------------------------------------------------------- */

interface DropdownBaseProps {
  /** Leading label shown before the selected value (e.g. "Projection"). */
  label?: ReactNode;
  /** Accessible label for the trigger button. */
  ariaLabel?: string;
  /** Disable the trigger. */
  disabled?: boolean;
  /** Menu placement relative to the trigger. Default: "bottom-left". */
  placement?: DropdownPlacement;
  /** Stretch trigger to fill available width (mobile). */
  fullWidth?: boolean;
  /** Override classes on the trigger button. */
  triggerClassName?: string;
  /** Override classes on the menu container. */
  menuClassName?: string;
  /** Controlled open state. Omit for uncontrolled. */
  open?: boolean;
  /** Called when open state should change. Required when `open` is provided. */
  onOpenChange?: (next: boolean) => void;
  /** Content rendered below the options inside the menu (e.g. footer links). */
  footer?: ReactNode;
}

interface SingleSelectProps<T extends string | number>
  extends DropdownBaseProps {
  mode?: "single";
  options: Array<DropdownOption<T>>;
  value: T;
  onChange: (next: T) => void;
  children?: never;
  triggerValue?: never;
  /** Override how each option renders. */
  renderOption?: (
    option: DropdownOption<T>,
    context: DropdownItemContext<T>
  ) => ReactNode;
  triggerLabel?: never;
  menuLabel?: never;
  clearLabel?: never;
}

interface MultiSelectProps<T extends string | number>
  extends DropdownBaseProps {
  mode: "multi";
  options: Array<DropdownOption<T>>;
  values: T[];
  onChange: (next: T[]) => void;
  children?: never;
  triggerValue?: never;
  /** Text shown on the trigger. */
  triggerLabel: string;
  /** Header text inside the menu. */
  menuLabel?: ReactNode;
  /** Clear-all button label. Omit to hide. */
  clearLabel?: string;
  /** Override how each option renders. */
  renderOption?: (
    option: DropdownOption<T>,
    context: DropdownItemContext<T>
  ) => ReactNode;
}

interface CustomContentProps extends DropdownBaseProps {
  mode?: never;
  options?: never;
  value?: never;
  values?: never;
  onChange?: never;
  renderOption?: never;
  triggerLabel?: never;
  menuLabel?: never;
  clearLabel?: never;
  /** The display value shown on the trigger. */
  triggerValue: ReactNode;
  /** Arbitrary menu content. */
  children: ReactNode;
}

export type DropdownProps<T extends string | number> =
  | SingleSelectProps<T>
  | MultiSelectProps<T>
  | CustomContentProps;

/* ---------------------------------------------------------------------------
   Internal helpers
   --------------------------------------------------------------------------- */

function useControllableOpen(
  controlledOpen: boolean | undefined,
  onOpenChange: ((next: boolean) => void) | undefined
) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  return [isOpen, setOpen] as const;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 shrink-0">
      <path
        d="M2 6l3 3 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="currentColor"
      className="h-2.5 w-2.5 shrink-0"
      aria-hidden="true"
    >
      <path d="M2.5 4.5l3.5 3.5 3.5-3.5" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   Style constants (tokenized)
   --------------------------------------------------------------------------- */

const triggerBase = cn(
  "flex items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
  "border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]",
  "font-sans text-[var(--color-fg-muted)]",
  "transition-colors hover:bg-[var(--color-surface-hover)]",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

const menuBase = cn(
  "absolute z-50 min-w-[180px] overflow-hidden rounded-xl border py-1 shadow-lg",
  "border-[var(--color-border-soft)] bg-[var(--color-surface-overlay)]"
);

const placementClassNames: Record<DropdownPlacement, string> = {
  "bottom-left": "left-0 top-full mt-1",
  "bottom-right": "right-0 top-full mt-1",
  "top-left": "bottom-full left-0 mb-1",
  "top-right": "bottom-full right-0 mb-1",
};

const itemBase = cn(
  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs",
  "text-[var(--color-fg-muted)]",
  "transition-colors hover:bg-[var(--color-surface-hover)]"
);

const itemActive = cn(
  "bg-[color:color-mix(in_srgb,var(--color-accent)_5%,transparent)]",
  "text-[var(--color-accent)]"
);

const menuHeaderClassName = cn(
  "flex items-center justify-between border-b px-3 py-3",
  "border-[var(--color-border-soft)]"
);

/* ---------------------------------------------------------------------------
   Component
   --------------------------------------------------------------------------- */

export function Dropdown<T extends string | number>(
  props: DropdownProps<T>
) {
  const {
    label,
    ariaLabel,
    disabled = false,
    placement = "bottom-left",
    fullWidth = false,
    triggerClassName,
    menuClassName,
    footer,
  } = props;

  const [isOpen, setOpen] = useControllableOpen(props.open, props.onOpenChange);
  const containerRef = useRef<HTMLDivElement>(null);

  // Escape key handling
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setOpen]);

  // Determine if this is a data-driven or custom-children dropdown
  const isCustomContent = "triggerValue" in props && props.triggerValue !== undefined;
  const isMulti = "mode" in props && props.mode === "multi";

  // Data-driven helpers
  const selectedValues = useMemo(() => {
    if (isCustomContent) return [];
    if (isMulti && "values" in props && props.values) return props.values;
    if ("value" in props && props.value !== undefined) return [props.value];
    return [];
  }, [isCustomContent, isMulti, props]);

  const selectedValueSet = useMemo(
    () => new Set(selectedValues),
    [selectedValues]
  );

  const options =
    "options" in props && props.options ? props.options : [];

  const activeOption = options.find((o) => selectedValueSet.has(o.value)) ?? options[0];

  /* ---- Trigger content ---- */

  let triggerContent: ReactNode;

  if (isCustomContent) {
    // Custom children mode — same layout as PillDropdown
    triggerContent = (
      <>
        {label ? (
          <span className="shrink-0 text-[var(--color-fg-subtle)]">
            {label}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate text-[var(--color-fg-default)]">
          {(props as CustomContentProps).triggerValue}
        </span>
      </>
    );
  } else if (isMulti) {
    const multiProps = props as MultiSelectProps<T>;
    triggerContent = (
      <>
        <span>{multiProps.triggerLabel}</span>
        <span
          className="flex h-4 w-4 items-center justify-center"
          aria-hidden="true"
        >
          {selectedValues.length > 0 ? (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] font-bold leading-none text-white">
              {selectedValues.length}
            </span>
          ) : null}
        </span>
      </>
    );
  } else {
    // Single select — with optional leading label
    if (label) {
      triggerContent = (
        <>
          <span className="shrink-0 text-[var(--color-fg-subtle)]">
            {label}
          </span>
          <span className="min-w-0 flex-1 truncate text-[var(--color-fg-default)]">
            {activeOption?.label}
          </span>
        </>
      );
    } else {
      triggerContent = <span>{activeOption?.label}</span>;
    }
  }

  /* ---- Menu content ---- */

  const handleItemClick = useCallback(
    (option: DropdownOption<T>) => {
      if (isMulti) {
        const multiProps = props as MultiSelectProps<T>;
        const isActive = selectedValueSet.has(option.value);
        const nextValues = isActive
          ? selectedValues.filter((v) => v !== option.value)
          : [...selectedValues, option.value];
        multiProps.onChange(nextValues);
        return;
      }
      if ("onChange" in props && props.onChange) {
        (props.onChange as (next: T) => void)(option.value);
      }
      setOpen(false);
    },
    [isMulti, props, selectedValueSet, selectedValues, setOpen]
  );

  const menuContent = isCustomContent ? (
    (props as CustomContentProps).children
  ) : (
    <>
      {isMulti &&
      ((props as MultiSelectProps<T>).menuLabel ||
        (props as MultiSelectProps<T>).clearLabel) ? (
        <div className={menuHeaderClassName}>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-fg-subtle)]">
            {(props as MultiSelectProps<T>).menuLabel}
          </span>
          {(props as MultiSelectProps<T>).clearLabel ? (
            <button
              type="button"
              onClick={() => (props as MultiSelectProps<T>).onChange([])}
              className="text-xs font-bold uppercase tracking-widest text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-default)]"
            >
              {(props as MultiSelectProps<T>).clearLabel}
            </button>
          ) : null}
        </div>
      ) : null}
      {options.map((option) => {
        const isActive = selectedValueSet.has(option.value);
        const context: DropdownItemContext<T> = {
          isSelected: isActive,
          value: option.value,
          close: () => setOpen(false),
        };

        if ("renderOption" in props && props.renderOption) {
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleItemClick(option)}
              className={cn(itemBase, isActive ? itemActive : "")}
            >
              {props.renderOption(option, context)}
            </button>
          );
        }

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleItemClick(option)}
            className={cn(itemBase, isActive ? itemActive : "")}
          >
            <div className="min-w-0 flex-1">
              <span>{option.label}</span>
              {option.description ? (
                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest opacity-70">
                  {option.description}
                </div>
              ) : null}
            </div>
            {isActive ? <CheckIcon /> : null}
          </button>
        );
      })}
    </>
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative", fullWidth ? "min-w-0 flex-1" : "")}
    >
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen(!isOpen);
        }}
        className={cn(
          triggerBase,
          fullWidth ? "w-full" : "",
          triggerClassName
        )}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        {triggerContent}
        <ChevronIcon />
      </button>

      {isOpen && !disabled ? (
        <>
          <button
            type="button"
            aria-label="Close dropdown"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              menuBase,
              placementClassNames[placement],
              menuClassName
            )}
          >
            {menuContent}
            {footer ? (
              <div className="border-t border-[var(--color-border-soft)]">
                {footer}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
