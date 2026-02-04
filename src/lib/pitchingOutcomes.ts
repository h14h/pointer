import type { PitcherStats } from "@/types";
import { normalizeIp } from "@/lib/ipMath";

export type PitchingOutcomeParams = {
  qsMinIp: number;
  qsFullIp: number;
  qsLambdaInnings: number;
  qsMaxEr: number;
  qsWinBase: number;
  qsWinScale: number;
  qsWinMin: number;
  qsWinMax: number;
  qsIpPower: number;
  qsErPower: number;
  qsWinPower: number;
  qsMidIp: number;
  qsMidFactor: number;
  cgMinIp: number;
  cgFullIp: number;
  cgMaxEr: number;
  cgIpPower: number;
  cgErPower: number;
  cgMidIp: number;
  cgMidFactor: number;
  cgLambdaInnings: number;
  cgScale: number;
  shoEraScale: number;
  shoScale: number;
  eraFipWeight: number;
  eraWhipEffect: number;
  eraK9Effect: number;
  eraBB9Effect: number;
  eraWhipCenter: number;
  eraK9Center: number;
  eraBB9Center: number;
  qsFeatureWhip: number;
  qsFeatureK9: number;
  qsFeatureBB9: number;
  reliefIpPerAppearance: number;
};

export type QsFilterParams = {
  minGS: number;
  minAdjustedIpPerStart: number;
  maxEffectiveEra: number;
  minQsProbability: number;
  minGsOverG: number;
  maxReliefApps: number;
  stage2MinGS: number;
  stage2MinGsOverG: number;
  stage2MaxReliefApps: number;
};

export const DEFAULT_PITCHING_OUTCOME_PARAMS: PitchingOutcomeParams = {
  qsMinIp: 4.8,
  qsFullIp: 6.5,
  qsLambdaInnings: 5.8,
  qsMaxEr: 3,
  qsWinBase: 0.95,
  qsWinScale: 0.5,
  qsWinMin: 0.75,
  qsWinMax: 1,
  qsIpPower: 0.9,
  qsErPower: 1.1,
  qsWinPower: 0.9,
  qsMidIp: 0,
  qsMidFactor: 0,
  cgMinIp: 7.7,
  cgFullIp: 9.2,
  cgMaxEr: 5,
  cgIpPower: 1.1,
  cgErPower: 0.9,
  cgMidIp: 0,
  cgMidFactor: 0,
  cgLambdaInnings: 9,
  cgScale: 0.07,
  shoEraScale: 1.05,
  shoScale: 1,
  eraFipWeight: 0.4,
  eraWhipEffect: 0,
  eraK9Effect: 0,
  eraBB9Effect: 0,
  eraWhipCenter: 1.25,
  eraK9Center: 8,
  eraBB9Center: 3,
  qsFeatureWhip: 0.15,
  qsFeatureK9: 0.05,
  qsFeatureBB9: 0.08,
  reliefIpPerAppearance: 1,
};

export const DEFAULT_QS_FILTER_PARAMS: QsFilterParams = {
  minGS: 3,
  minAdjustedIpPerStart: 4.5,
  maxEffectiveEra: 6,
  minQsProbability: 0.1,
  minGsOverG: 0,
  maxReliefApps: Number.POSITIVE_INFINITY,
  stage2MinGS: 0,
  stage2MinGsOverG: 0,
  stage2MaxReliefApps: Number.POSITIVE_INFINITY,
};

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

function ipRamp(avgIpPerStart: number, minIp: number, fullIp: number): number {
  if (fullIp <= minIp) return avgIpPerStart >= fullIp ? 1 : 0;
  return clamp((avgIpPerStart - minIp) / (fullIp - minIp), 0, 1);
}

function ipRampPiecewise(
  avgIpPerStart: number,
  minIp: number,
  midIp: number,
  fullIp: number,
  midFactor: number
): number {
  if (midIp <= minIp || fullIp <= midIp) {
    return ipRamp(avgIpPerStart, minIp, fullIp);
  }
  const clampedMidFactor = clamp(midFactor, 0, 1);
  if (avgIpPerStart <= minIp) return 0;
  if (avgIpPerStart >= fullIp) return 1;
  if (avgIpPerStart <= midIp) {
    return clamp(
      ((avgIpPerStart - minIp) / (midIp - minIp)) * clampedMidFactor,
      0,
      clampedMidFactor
    );
  }
  return clamp(
    clampedMidFactor +
      ((avgIpPerStart - midIp) / (fullIp - midIp)) * (1 - clampedMidFactor),
    clampedMidFactor,
    1
  );
}

function resolveIpFactor(
  avgIpPerStart: number,
  minIp: number,
  midIp: number,
  fullIp: number,
  midFactor: number
): number {
  if (midIp > minIp && fullIp > midIp && midFactor > 0) {
    return ipRampPiecewise(avgIpPerStart, minIp, midIp, fullIp, midFactor);
  }
  return ipRamp(avgIpPerStart, minIp, fullIp);
}

function adjustedInningsPitched(
  IP: number,
  G: number | undefined,
  GS: number,
  reliefIpPerAppearance: number,
  useBaseballIp: boolean
): number {
  const ipInfo = useBaseballIp ? normalizeIp(IP) : null;
  const innings = useBaseballIp ? (ipInfo && ipInfo.valid ? ipInfo.innings : 0) : IP;
  const reliefApps = Math.max((G ?? GS) - GS, 0);
  if (reliefApps <= 0) return innings;
  const reliefIp = reliefApps * reliefIpPerAppearance;
  return Math.max(innings - reliefIp, 0);
}

function effectiveEra(
  input: {
    ERA: number;
    FIP?: number;
    WHIP?: number;
    "K/9"?: number;
    "BB/9"?: number;
  },
  params: PitchingOutcomeParams
): number {
  let era = input.ERA;

  if ((input.FIP ?? 0) > 0 && params.eraFipWeight > 0) {
    const weight = clamp(params.eraFipWeight, 0, 1);
    era = era * (1 - weight) + (input.FIP ?? era) * weight;
  }

  if ((input.WHIP ?? 0) > 0 && params.eraWhipEffect !== 0) {
    era *= 1 + params.eraWhipEffect * ((input.WHIP ?? params.eraWhipCenter) - params.eraWhipCenter);
  }

  if ((input["K/9"] ?? 0) > 0 && params.eraK9Effect !== 0) {
    era *= 1 - params.eraK9Effect * ((input["K/9"] ?? params.eraK9Center) - params.eraK9Center);
  }

  if ((input["BB/9"] ?? 0) > 0 && params.eraBB9Effect !== 0) {
    era *= 1 + params.eraBB9Effect * ((input["BB/9"] ?? params.eraBB9Center) - params.eraBB9Center);
  }

  return Math.max(era, 0.5);
}

function qsProbabilityPerStart(
  input: {
    ERA: number;
    FIP?: number;
    WHIP?: number;
    "K/9"?: number;
    "BB/9"?: number;
  },
  params: PitchingOutcomeParams
): number {
  const effEra = effectiveEra(input, params);
  const lambda = (effEra * params.qsLambdaInnings) / 9;
  return poissonCdf(lambda, params.qsMaxEr);
}

export function predictHasQualityStarts(
  input: {
    G?: number;
    GS: number;
    IP: number;
    ERA: number;
    FIP?: number;
    WHIP?: number;
    "K/9"?: number;
    "BB/9"?: number;
  },
  params: PitchingOutcomeParams = DEFAULT_PITCHING_OUTCOME_PARAMS,
  filter: QsFilterParams = DEFAULT_QS_FILTER_PARAMS
): boolean {
  void params;
  void filter;

  return input.GS >= 6;
}

export function estimateQualityStarts(
  input: {
    GS: number;
    IP: number;
    G?: number;
    ERA: number;
    W: number;
    FIP?: number;
    WHIP?: number;
    "K/9"?: number;
    "BB/9"?: number;
  },
  params: PitchingOutcomeParams = DEFAULT_PITCHING_OUTCOME_PARAMS,
  useBaseballIp = false
): number {
  void params;

  const { GS, ERA } = input;
  const ipInfo = useBaseballIp ? normalizeIp(input.IP) : null;
  const IP = useBaseballIp ? (ipInfo && ipInfo.valid ? ipInfo.innings : 0) : input.IP;
  if (GS <= 0 || IP <= 0 || ERA <= 0) return 0;
  if (GS < 6) return 0;

  const appearances = input.G ?? GS;
  const adjIP = IP - (appearances - GS) * 1.81;

  const estimate =
    1.6601858118151562 +
    -0.6387303455623031 * GS +
    0.1952732531471503 * adjIP +
    -0.5647520638483603 * ERA;

  return Math.max(estimate, 0);
}

export function estimateCompleteGames(
  input: {
    GS: number;
    IP: number;
    G?: number;
    ERA: number;
    FIP?: number;
    WHIP?: number;
    "K/9"?: number;
    "BB/9"?: number;
  },
  params: PitchingOutcomeParams = DEFAULT_PITCHING_OUTCOME_PARAMS,
  useBaseballIp = false
): number {
  void params;

  const { GS, ERA } = input;
  const ipInfo = useBaseballIp ? normalizeIp(input.IP) : null;
  const IP = useBaseballIp ? (ipInfo && ipInfo.valid ? ipInfo.innings : 0) : input.IP;
  if (GS <= 0 || IP <= 0 || ERA <= 0) return 0;
  if (GS < 6) return 0;

  const appearances = input.G ?? GS;
  const adjIP = IP - (appearances - GS) * 1.59;

  const estimate =
    0.0913277786691081 +
    -0.056865541289444044 * GS +
    0.011711275081015677 * adjIP +
    -0.0193119643732167 * ERA;

  return Math.max(estimate, 0);
}

export function estimateShutouts(
  input: {
    GS: number;
    IP: number;
    G?: number;
    ERA: number;
    CG: number;
    FIP?: number;
    WHIP?: number;
    "K/9"?: number;
    "BB/9"?: number;
  },
  params: PitchingOutcomeParams = DEFAULT_PITCHING_OUTCOME_PARAMS,
  useBaseballIp = false
): number {
  void params;
  void input.CG;

  const { GS, ERA } = input;
  const ipInfo = useBaseballIp ? normalizeIp(input.IP) : null;
  const IP = useBaseballIp ? (ipInfo && ipInfo.valid ? ipInfo.innings : 0) : input.IP;
  if (GS <= 0 || IP <= 0 || ERA <= 0) return 0;
  if (GS < 6) return 0;

  const appearances = input.G ?? GS;
  const adjIP = IP - (appearances - GS) * 1.62;

  const estimate =
    0.06309944584999562 +
    -0.0223845818844781 * GS +
    0.004565597329477387 * adjIP +
    -0.011101129116249924 * ERA;

  return Math.max(estimate, 0);
}

export function resolveQualityStarts(
  stats: Pick<
    PitcherStats,
    "QS" | "GS" | "G" | "IP" | "ERA" | "W" | "FIP" | "WHIP" | "K/9" | "BB/9"
  >,
  useBaseballIp = false
): number {
  if ((stats.QS ?? 0) > 0) return stats.QS;
  if ((stats.GS ?? 0) <= 0) return 0;
  const rawIp = stats.IP ?? 0;
  const ipInfo = useBaseballIp ? normalizeIp(rawIp) : null;
  const ipValue = useBaseballIp ? (ipInfo && ipInfo.valid ? ipInfo.innings : 0) : rawIp;
  if (ipValue <= 0) return 0;
  if ((stats.ERA ?? 0) <= 0) return 0;

  return estimateQualityStarts({
    GS: stats.GS,
    G: stats.G,
    IP: rawIp,
    ERA: stats.ERA,
    W: stats.W ?? 0,
    FIP: stats.FIP,
    WHIP: stats.WHIP,
    "K/9": stats["K/9"],
    "BB/9": stats["BB/9"],
  }, undefined, useBaseballIp);
}

export function resolveCompleteGames(
  stats: Pick<
    PitcherStats,
    "CG" | "GS" | "G" | "IP" | "ERA" | "FIP" | "WHIP" | "K/9" | "BB/9"
  >,
  useBaseballIp = false
): number {
  if ((stats.CG ?? 0) > 0) return stats.CG;
  if ((stats.GS ?? 0) <= 0) return 0;
  const rawIp = stats.IP ?? 0;
  const ipInfo = useBaseballIp ? normalizeIp(rawIp) : null;
  const ipValue = useBaseballIp ? (ipInfo && ipInfo.valid ? ipInfo.innings : 0) : rawIp;
  if (ipValue <= 0) return 0;
  if ((stats.ERA ?? 0) <= 0) return 0;

  return estimateCompleteGames({
    GS: stats.GS,
    G: stats.G,
    IP: rawIp,
    ERA: stats.ERA,
    FIP: stats.FIP,
    WHIP: stats.WHIP,
    "K/9": stats["K/9"],
    "BB/9": stats["BB/9"],
  }, undefined, useBaseballIp);
}

export function resolveShutouts(
  stats: Pick<
    PitcherStats,
    "ShO" | "CG" | "GS" | "G" | "IP" | "ERA" | "FIP" | "WHIP" | "K/9" | "BB/9"
  >,
  useBaseballIp = false
): number {
  if ((stats.ShO ?? 0) > 0) return stats.ShO;
  if ((stats.GS ?? 0) <= 0) return 0;
  const rawIp = stats.IP ?? 0;
  const ipInfo = useBaseballIp ? normalizeIp(rawIp) : null;
  const ipValue = useBaseballIp ? (ipInfo && ipInfo.valid ? ipInfo.innings : 0) : rawIp;
  if (ipValue <= 0) return 0;
  if ((stats.ERA ?? 0) <= 0) return 0;

  const cg = (stats.CG ?? 0) > 0
    ? stats.CG
    : estimateCompleteGames({
        GS: stats.GS,
        G: stats.G,
        IP: rawIp,
        ERA: stats.ERA,
        FIP: stats.FIP,
        WHIP: stats.WHIP,
        "K/9": stats["K/9"],
        "BB/9": stats["BB/9"],
      }, undefined, useBaseballIp);

  return estimateShutouts({
    GS: stats.GS,
    G: stats.G,
    IP: rawIp,
    ERA: stats.ERA,
    CG: cg,
    FIP: stats.FIP,
    WHIP: stats.WHIP,
    "K/9": stats["K/9"],
    "BB/9": stats["BB/9"],
  }, undefined, useBaseballIp);
}
