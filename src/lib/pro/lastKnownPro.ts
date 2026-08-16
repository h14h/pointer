const STORAGE_KEY = "draftspa:lastKnownPro";
export const LAST_KNOWN_PRO_EVENT = "draftspa:lastKnownPro";

export type LastKnownPro = {
  clerkUserId: string;
  status: "active";
  period: string;
  confirmedAt: number;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readLastKnownPro(): LastKnownPro | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastKnownPro>;
    if (
      typeof parsed.clerkUserId !== "string" ||
      parsed.status !== "active" ||
      typeof parsed.period !== "string" ||
      typeof parsed.confirmedAt !== "number"
    ) {
      return null;
    }
    return {
      clerkUserId: parsed.clerkUserId,
      status: "active",
      period: parsed.period,
      confirmedAt: parsed.confirmedAt,
    };
  } catch {
    return null;
  }
}

export function lastKnownProForUser(clerkUserId: string | null | undefined): boolean {
  if (!clerkUserId) return false;
  const known = readLastKnownPro();
  return known?.clerkUserId === clerkUserId && known.status === "active";
}

export function writeLastKnownPro(value: LastKnownPro): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(LAST_KNOWN_PRO_EVENT));
}

export function clearLastKnownPro(clerkUserId?: string | null): void {
  if (!canUseStorage()) return;
  const known = readLastKnownPro();
  if (clerkUserId && known && known.clerkUserId !== clerkUserId) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(LAST_KNOWN_PRO_EVENT));
}
