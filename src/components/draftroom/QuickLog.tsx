"use client";

import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { Chip } from "@/components/ui/Chip";
import { LedgerRow } from "@/components/ui/LedgerRow";
import { normalizePlayerSearchText } from "@/lib/leaderboard";
import { type LoggedPick, type RoomPlayer } from "./model";

type SuggestionRow = { player: RoomPlayer; pinned: boolean };

/**
 * The quick-log bar — THE primary input. Type a few letters, Enter confirms
 * the selected player to whichever team is on the clock. Never auto-advances;
 * every pick is logged by hand, as fast as possible.
 */
export function QuickLog({
  available,
  targetIds,
  isMyPick,
  onClockTeamName,
  lastLog,
  canUndo,
  onLog,
  onUndo,
  inputRef,
}: {
  available: RoomPlayer[];
  targetIds: Set<string>;
  isMyPick: boolean;
  onClockTeamName: string;
  lastLog: LoggedPick | null;
  canUndo: boolean;
  onLog: (player: RoomPlayer) => void;
  onUndo: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  /* Auto-focus on entering the room (focus via ref — no state in effects). */
  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  /* "/" refocuses the quick log from anywhere; never intercept real inputs. */
  useEffect(() => {
    const input = inputRef.current;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      input?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputRef]);

  /** Top available TARGET when one survives, else top available by points. */
  const recommended = useMemo(() => {
    if (!isMyPick) return null;
    return available.find((p) => targetIds.has(p.id)) ?? available[0] ?? null;
  }, [isMyPick, available, targetIds]);

  const rows = useMemo<SuggestionRow[]>(() => {
    const q = normalizePlayerSearchText(query.trim());
    if (!q) return [];
    // Once the user is typing, the TYPED matches own the keyboard selection —
    // never pin the recommendation into the list, or Enter logs the wrong
    // player ("type a name, Enter confirms" must mean the name you typed).
    // The recommendation stays reachable via plain Enter on an empty query.
    return available
      .filter((p) => p.searchText.includes(q))
      .slice(0, 6)
      .map((player) => ({ player, pinned: false }));
  }, [query, available]);

  const effectiveIndex = Math.min(selectedIndex, Math.max(rows.length - 1, 0));

  const logRow = (player: RoomPlayer) => {
    onLog(player);
    setQuery("");
    setSelectedIndex(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, Math.max(rows.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const choice = rows[effectiveIndex]?.player;
      if (choice) logRow(choice);
      else if (!query.trim() && recommended) logRow(recommended);
    } else if (event.key === "Escape") {
      setQuery("");
      setSelectedIndex(0);
    }
  };

  return (
    <div className="flex flex-none flex-col items-center px-6 pb-1 pt-1">
      <div className="relative w-full max-w-2xl">
        <span
          className={
            isMyPick
              ? "font-data pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--color-accent)]"
              : "font-data pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--color-fg-subtle)]"
          }
          aria-hidden="true"
        >
          »
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={`log a pick — type a name, Enter confirms to ${onClockTeamName}`}
          aria-label="log a pick"
          className={
            isMyPick
              ? "font-data w-full rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-surface-base)] py-3 pl-9 pr-16 text-sm text-[var(--color-fg-default)] shadow-[0_0_0_1px_var(--color-accent),0_0_28px_color-mix(in_srgb,var(--color-accent)_18%,transparent)] outline-none placeholder:text-[var(--color-fg-subtle)]"
              : "font-data w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-base)] py-3 pl-9 pr-16 text-sm text-[var(--color-fg-default)] outline-none placeholder:text-[var(--color-fg-subtle)] focus:border-[var(--color-accent)]"
          }
        />
        <Chip className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          /
        </Chip>

        {rows.length > 0 && (
          <div className="absolute inset-x-0 top-[calc(100%+4px)] z-[var(--z-popover)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-overlay)] shadow-[var(--shadow-overlay)]">
            {rows.map(({ player, pinned }, index) => (
              <LedgerRow
                as="button"
                key={player.id}
                onClick={() => logRow(player)}
                className={
                  index === effectiveIndex
                    ? "grid w-full grid-cols-[auto_1fr_auto_auto] border-l-2 border-l-[var(--color-accent)] bg-[color:color-mix(in_srgb,var(--color-accent)_10%,transparent)] py-2 text-left"
                    : "grid w-full grid-cols-[auto_1fr_auto_auto] border-l-2 border-l-transparent py-2 text-left hover:bg-[var(--color-surface-hover)]"
                }
              >
                <span className="stamp w-20 text-left text-[var(--color-accent)]">
                  {pinned ? "recommend:" : ""}
                </span>
                <span className="truncate text-sm font-semibold text-[var(--color-fg-default)]">
                  {targetIds.has(player.id) && (
                    <span className="mr-1.5 text-[var(--color-accent)]">★</span>
                  )}
                  {player.name}
                </span>
                <span className="font-data text-xs text-[var(--color-fg-muted)]">
                  {player.pos} · {player.team}
                </span>
                <span className="font-data text-xs text-[var(--color-fg-default)]">
                  {Math.round(player.points)} pts
                </span>
              </LedgerRow>
            ))}
          </div>
        )}
      </div>

      {/* fixed-height meta line — confirmation / recommendation / hint */}
      <div className="font-data flex h-6 w-full max-w-2xl items-center gap-3 text-xs">
        {lastLog ? (
          <>
            <span className="truncate text-[var(--color-accent)]">
              logged: p{lastLog.overall} {lastLog.playerName} → {lastLog.teamName}
            </span>
            {canUndo && (
              <button
                type="button"
                onClick={onUndo}
                className="text-[var(--color-warning)] underline underline-offset-2"
              >
                undo
              </button>
            )}
          </>
        ) : recommended ? (
          <span className="truncate text-[var(--color-accent)]">
            recommend: {recommended.name} ({recommended.pos} ·{" "}
            {Math.round(recommended.points)} pts)
            <span className="ml-2 text-[var(--color-fg-subtle)]">
              Enter takes the recommendation
            </span>
          </span>
        ) : (
          <span className="text-[var(--color-fg-subtle)]">
            press / to focus · Enter confirms to {onClockTeamName} · click any
            board row to log
          </span>
        )}
      </div>
    </div>
  );
}
