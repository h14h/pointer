import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { cx } from "@/components/ui/cx";

const dropdownTriggerClassName =
  "flex min-h-8 items-center gap-1.5 rounded-sm border border-[#111111]/30 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#111111]/70 transition-colors hover:bg-[#f5f5f5] dark:border-[#333333] dark:text-[#e5e5e5]/60 dark:hover:bg-[#1a1a1a]";

const dropdownMenuClassName =
  "absolute z-20 min-w-[180px] rounded-sm border border-[#111111]/15 bg-white shadow-lg dark:border-[#333333] dark:bg-[#1a1a1a]";

const dropdownItemClassName =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#111111]/70 transition-colors hover:bg-[#f5f5f5] dark:text-[#e5e5e5]/60 dark:hover:bg-[#2a2a2a]";

export interface MenuSelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface MenuSelectBaseProps<T extends string | number> {
  options: Array<MenuSelectOption<T>>;
  ariaLabel?: string;
  triggerClassName?: string;
  menuClassName?: string;
  menuPlacement?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
}

interface SingleMenuSelectProps<T extends string | number>
  extends MenuSelectBaseProps<T> {
  mode?: "single";
  value: T;
  onChange: (nextValue: T) => void;
}

interface MultiMenuSelectProps<T extends string | number>
  extends MenuSelectBaseProps<T> {
  mode: "multi";
  values: T[];
  onChange: (nextValues: T[]) => void;
  triggerLabel: string;
  menuLabel?: ReactNode;
  clearLabel?: string;
}

export type MenuSelectProps<T extends string | number> =
  | SingleMenuSelectProps<T>
  | MultiMenuSelectProps<T>;

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

export function MenuSelect<T extends string | number>(props: MenuSelectProps<T>) {
  const {
    options,
    ariaLabel,
    triggerClassName,
    menuClassName,
    menuPlacement = "bottom-left",
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const isMulti = props.mode === "multi";
  const selectedValues = useMemo(
    () => (props.mode === "multi" ? props.values : [props.value]),
    [props]
  );
  const selectedValueSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const activeOption = options.find((option) => selectedValueSet.has(option.value)) ?? options[0];
  const placementClassName =
    menuPlacement === "bottom-left"
      ? "left-0 top-full mt-1"
      : menuPlacement === "bottom-right"
        ? "right-0 top-full mt-1"
        : menuPlacement === "top-left"
          ? "bottom-full left-0 mb-1"
          : "bottom-full right-0 mb-1";

  const triggerContent = isMulti ? (
    <>
      <span>{props.triggerLabel}</span>
      <span className="flex h-4 w-4 items-center justify-center" aria-hidden="true">
        {selectedValues.length > 0 ? (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#dc2626] text-[10px] font-bold leading-none text-white dark:bg-[#ef4444]">
            {selectedValues.length}
          </span>
        ) : null}
      </span>
    </>
  ) : (
    <span>{activeOption.label}</span>
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cx(dropdownTriggerClassName, triggerClassName)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        {triggerContent}
        <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5 shrink-0">
          <path d="M2.5 4.5l3.5 3.5 3.5-3.5" />
        </svg>
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setIsOpen(false)}
          />
          <div className={cx(dropdownMenuClassName, placementClassName, menuClassName)}>
            {isMulti && (props.menuLabel || props.clearLabel) ? (
              <div className="flex items-center justify-between border-b border-[#111111]/10 px-3 py-3 dark:border-[#e5e5e5]/[0.08]">
                <span className="text-xs font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40">
                  {props.menuLabel}
                </span>
                {props.clearLabel ? (
                  <button
                    type="button"
                    onClick={() => props.onChange([])}
                    className="text-xs font-bold uppercase tracking-widest text-[#111111]/40 dark:text-[#e5e5e5]/30 hover:text-[#111111] dark:hover:text-[#e5e5e5]"
                  >
                    {props.clearLabel}
                  </button>
                ) : null}
              </div>
            ) : null}
            {options.map((option) => {
              const isActive = selectedValueSet.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (isMulti) {
                      const nextValues = isActive
                        ? selectedValues.filter((value) => value !== option.value)
                        : [...selectedValues, option.value];
                      props.onChange(nextValues);
                      return;
                    }
                    props.onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cx(
                    dropdownItemClassName,
                    isActive
                      ? "bg-[#dc2626]/[0.05] text-[#dc2626] dark:bg-[#ef4444]/[0.05] dark:text-[#ef4444]"
                      : ""
                  )}
                >
                  <span>{option.label}</span>
                  {isActive ? <CheckIcon /> : null}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
