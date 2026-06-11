import { cn } from "@/lib/utils";

/**
 * The DraftSpa horizon mark: a half-disc on a horizon line — sun above it by
 * day, moon-dot below it by night. Both glyphs render and CSS picks one from
 * the document's `[data-mode]`, so every surface gets the right mark without
 * opting in. Pure currentColor so it inherits the surrounding text color.
 */
export function HorizonMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      aria-hidden
      className={cn("inline-block", className)}
      fill="none"
    >
      {/* day: sun above the horizon */}
      <g className="[[data-mode=night]_&]:hidden">
        <path d="M7 16a7 7 0 0 1 14 0" fill="currentColor" />
        <line
          x1="3"
          y1="16"
          x2="25"
          y2="16"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </g>
      {/* night: moon below the horizon */}
      <g className="hidden [[data-mode=night]_&]:block">
        <line
          x1="3"
          y1="12"
          x2="25"
          y2="12"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="14" cy="19" r="4" fill="currentColor" />
      </g>
    </svg>
  );
}

/**
 * Brand lockup: horizon mark + lowercase `draftspa` in the data face,
 * optionally with the tagline underneath.
 */
export function Wordmark({
  tagline = false,
  className,
}: {  tagline?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <HorizonMark className="size-6 text-[var(--color-accent)]" />
      <span className="flex flex-col leading-none">
        <span className="font-data text-lg font-semibold tracking-tight text-[var(--color-fg-default)]">
          draftspa
        </span>
        {tagline ? (
          <span className="stamp mt-1 normal-case tracking-[0.08em]">
            the calm draft desk
          </span>
        ) : null}
      </span>
    </span>
  );
}
