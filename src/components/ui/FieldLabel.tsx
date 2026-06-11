import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FieldLabelProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

export function FieldLabel({ className, children, ...props }: FieldLabelProps) {
  return (
    <span className={cn("stamp", className)} {...props}>
      {children}
    </span>
  );
}
