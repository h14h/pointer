import type { ElementType, ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleAs?: ElementType;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
  titleAs: TitleTag = "h2",
  titleClassName,
  descriptionClassName,
}: SectionHeaderProps) {
  return (
    <div
      className={cx(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div>
        <TitleTag
          className={cx(
            "font-bold text-[var(--color-fg-default)]",
            titleClassName ?? "text-xl sm:text-2xl"
          )}
          style={{ fontFamily: "var(--font-title)" }}
        >
          {title}
        </TitleTag>
        {description ? (
          <p
            className={cx(
              "mt-1 text-sm text-[var(--color-fg-muted)]",
              descriptionClassName
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
