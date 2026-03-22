"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cx } from "@/components/ui/cx";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
  ElementRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(function TooltipContent({ className, sideOffset = 8, children, ...props }, ref) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cx(
          "z-50 max-w-64 rounded-md border border-[#111111]/10 bg-[#fffaf5] px-3 py-2 text-xs leading-5 text-[#111111]/80 shadow-[0_10px_30px_rgba(17,17,17,0.12)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 dark:border-[#e5e5e5]/10 dark:bg-[#202020] dark:text-[#e5e5e5]/78 dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-[#fffaf5] dark:fill-[#202020]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
});
