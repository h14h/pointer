/**
 * UUID v4 generator that works in both secure and non-secure contexts.
 * Falls back to Math.random() when crypto.randomUUID() is unavailable.
 */
export function randomUUID(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to manual implementation
    }
  }

  // Manual UUID v4 implementation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
