"use client";

// The dusk/dawn moment, done cheaply. Instead of CSS-transitioning every
// element's colors (which repaints thousands of table cells and janks), a
// single full-screen veil falls over the page, the theme attribute swaps
// instantly underneath it, and the veil lifts once the destination route has
// mounted. One compositor-friendly opacity animation — and it masks route
// loading time for free.
//
// Usage:
//   await beginNightTransition(true);   // veil falls, theme flips to night
//   router.push(`/league/${id}/draft`); // navigate under the veil
//   ...destination calls settleNightTransition() on mount → veil lifts.

import { useEffect, useSyncExternalStore } from "react";

type VeilPhase = "hidden" | "falling" | "holding" | "lifting";

const FALL_MS = 240;
const LIFT_MS = 400;
// Never trap the user behind the veil if a navigation fails to settle
const HOLD_CAP_MS = 8000;

let phase: VeilPhase = "hidden";
const listeners = new Set<() => void>();
let holdCapTimer: ReturnType<typeof setTimeout> | null = null;
let liftTimer: ReturnType<typeof setTimeout> | null = null;

function setPhase(next: VeilPhase) {
  phase = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function applyMode(toNight: boolean) {
  const root = document.documentElement;
  if (toNight) {
    root.setAttribute("data-mode", "night");
  } else {
    root.removeAttribute("data-mode");
  }
}

/**
 * Drop the veil, flip the theme under it, resolve. The caller navigates after
 * the promise resolves; the veil holds until the destination settles it.
 */
export function beginNightTransition(toNight: boolean): Promise<void> {
  return new Promise((resolve) => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) {
      applyMode(toNight);
      resolve();
      return;
    }

    if (liftTimer) clearTimeout(liftTimer);
    setPhase("falling");
    setTimeout(() => {
      applyMode(toNight);
      setPhase("holding");
      if (holdCapTimer) clearTimeout(holdCapTimer);
      holdCapTimer = setTimeout(() => settleNightTransition(), HOLD_CAP_MS);
      resolve();
    }, FALL_MS);
  });
}

/**
 * Lift the veil. Destinations call this on mount; it's a no-op when no
 * transition is in flight, so it's safe to call from every shell.
 */
export function settleNightTransition() {
  if (phase !== "holding" && phase !== "falling") return;
  if (holdCapTimer) {
    clearTimeout(holdCapTimer);
    holdCapTimer = null;
  }
  setPhase("lifting");
  liftTimer = setTimeout(() => setPhase("hidden"), LIFT_MS);
}

/** Mount-time settle for destination shells (workspace, fleet, draft room). */
export function useSettleNightTransition() {
  useEffect(() => {
    settleNightTransition();
  }, []);
}

/**
 * The veil itself — mounted once in the root layout. Keyframe-driven so a
 * single render starts the animation (no two-frame opacity dance).
 */
export function DuskVeil() {
  const current = useSyncExternalStore(
    subscribe,
    () => phase,
    () => "hidden" as const,
  );
  if (current === "hidden") return null;

  return (
    <div
      aria-hidden
      data-phase={current}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-veil)" as unknown as number,
        background: "var(--color-dusk-veil)",
        // Block interaction while covered; let clicks through as it lifts
        pointerEvents: current === "lifting" ? "none" : "auto",
        opacity: current === "lifting" ? 0 : 1,
        animation:
          current === "falling"
            ? `dusk-veil-fall ${FALL_MS}ms ease-in both`
            : current === "lifting"
              ? `dusk-veil-lift ${LIFT_MS}ms ease-out both`
              : undefined,
      }}
    />
  );
}
