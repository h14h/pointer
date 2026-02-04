import type { PitcherStats } from "@/types";

const MIN_IP_PER_START = 5;
const FULL_IP_PER_START = 6.5;
const MIN_ERA_FOR_ESTIMATE = 0.5;
const WIN_FACTOR_MIN = 0.75;
const WIN_FACTOR_MAX = 1.1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function poissonCdf(lambda: number, maxK: number): number {
  let sum = 0;
  let term = 1; // lambda^0 / 0!

  for (let k = 0; k <= maxK; k += 1) {
    if (k > 0) {
      term *= lambda / k;
    }
    sum += term;
  }

  return Math.exp(-lambda) * sum;
}

export function estimateQualityStarts(input: {
  GS: number;
  IP: number;
  ERA: number;
  W: number;
}): number {
  const { GS, IP, ERA, W } = input;

  if (GS <= 0 || IP <= 0) return 0;
  if (ERA <= 0) return 0;

  const avgIpPerStart = IP / GS;
  const ipFactor = clamp(
    (avgIpPerStart - MIN_IP_PER_START) / (FULL_IP_PER_START - MIN_IP_PER_START),
    0,
    1
  );

  if (ipFactor === 0) return 0;

  const safeEra = Math.max(ERA, MIN_ERA_FOR_ESTIMATE);
  const lambda = (safeEra * 6) / 9;
  const erFactor = poissonCdf(lambda, 3);

  const winRate = GS > 0 ? W / GS : 0;
  const winFactor = clamp(0.85 + winRate * 0.5, WIN_FACTOR_MIN, WIN_FACTOR_MAX);

  const estimate = GS * ipFactor * erFactor * winFactor;
  return clamp(roundToTenth(estimate), 0, GS);
}

export function resolveQualityStarts(
  stats: Pick<PitcherStats, "QS" | "GS" | "IP" | "ERA" | "W">
): number {
  if ((stats.QS ?? 0) > 0) return stats.QS;
  if ((stats.GS ?? 0) <= 0) return 0;
  if ((stats.IP ?? 0) <= 0) return 0;
  if ((stats.ERA ?? 0) <= 0) return 0;

  return estimateQualityStarts({
    GS: stats.GS,
    IP: stats.IP,
    ERA: stats.ERA,
    W: stats.W ?? 0,
  });
}
