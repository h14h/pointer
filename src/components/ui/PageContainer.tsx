import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
}

export function PageContainer({
  as: Component = "div",
  className,
  children,
  ...props
}: PageContainerProps) {
  return (
    <Component
      className={cn(
        "mx-auto w-full max-w-[var(--width-page)] px-[var(--space-page-x)] sm:px-[var(--space-page-x-sm)]",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
