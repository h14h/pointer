import type { ElementType, ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  size?: "section" | "page";
  className?: string;
  titleAs?: ElementType;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function SectionHeader({
  title,
  description,
  actions,
  eyebrow,
  meta,
  size = "section",
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
        {eyebrow ? (
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-fg-subtle)]">
            {eyebrow}
          </div>
        ) : null}
        <TitleTag
          className={cx(
            "font-bold text-[var(--color-fg-default)]",
            titleClassName ?? (size === "page" ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl")
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
        {meta ? <div className="mt-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
