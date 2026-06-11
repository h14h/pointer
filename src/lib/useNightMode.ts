"use client";

import { useLayoutEffect } from "react";

/**
 * Holds the document in the NIGHT theme while the calling component (the
 * draft room) is mounted, and releases it on unmount.
 *
 * The theme itself is pure CSS — `[data-mode="night"]` in globals.css swaps
 * the token values. Layout-effect timing means a deep link straight to the
 * draft room paints night on the first frame (no day flash). The *animated*
 * dusk/dawn moment is owned by src/lib/nightTransition.tsx, which flips the
 * same attribute under its veil before navigation; setting it again here is
 * an idempotent no-op.
 */
export function useNightMode(enabled: boolean = true) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.setAttribute("data-mode", "night");
    return () => root.removeAttribute("data-mode");
  }, [enabled]);
}
