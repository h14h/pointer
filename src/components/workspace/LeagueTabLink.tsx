"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { leagueHref, pushLeaguePath, type LeagueTab } from "@/lib/leaguePath";

/**
 * An anchor between league surfaces that navigates via history.pushState —
 * zero server traffic (every league URL is the same static shell). Keeps
 * real <a> semantics: middle/cmd-click, copy-link, and accessibility roles
 * all behave like a normal link.
 */
export function LeagueTabLink({
  leagueId,
  tab,
  children,
  onNavigate,
  ...props
}: {
  leagueId: string;
  tab: LeagueTab;
  children: ReactNode;
  /** Called after a same-page pushState navigation (not on modified clicks) */
  onNavigate?: () => void;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Let the browser handle new-tab/window/download gestures
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    pushLeaguePath(leagueId, tab);
    onNavigate?.();
  };

  return (
    <a href={leagueHref(leagueId, tab)} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
