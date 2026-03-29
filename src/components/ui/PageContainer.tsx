import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "@/components/ui/cx";

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
      className={cx(
        "mx-auto w-full max-w-[var(--width-page)] px-[var(--space-page-x)] sm:px-[var(--space-page-x-sm)]",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
