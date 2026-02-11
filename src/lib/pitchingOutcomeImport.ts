import type {
  PitchingOutcomeMissingSummary,
  PitchingOutcomeStat,
} from "@/lib/csvParser";
import {
  estimateQualityStarts,
  estimateCompleteGames,
  estimateShutouts,
} from "@/lib/pitchingOutcomes";
import type { PitcherPlayer } from "@/types";

export type PitchingOutcomeEstimateSelection = Record<PitchingOutcomeStat, boolean>;

export const DEFAULT_PITCHING_OUTCOME_ESTIMATE_SELECTION: PitchingOutcomeEstimateSelection =
  {
    QS: false,
    CG: false,
    ShO: false,
  };

function buildMissingSets(summary: PitchingOutcomeMissingSummary) {
  return {
    QS: new Set(summary.QS.missingPlayerIds),
    CG: new Set(summary.CG.missingPlayerIds),
    ShO: new Set(summary.ShO.missingPlayerIds),
  };
}

export function applyPitchingOutcomeEstimates(
  pitchers: PitcherPlayer[],
  summary: PitchingOutcomeMissingSummary | null,
  selection: PitchingOutcomeEstimateSelection,
  useBaseballIp = false
): PitcherPlayer[] {
  const shouldEstimate = selection.QS || selection.CG || selection.ShO;
  if (!summary || !shouldEstimate || pitchers.length === 0) {
    return pitchers;
  }

  const missingSets = buildMissingSets(summary);
  let didChange = false;

  const updatedPitchers = pitchers.map((pitcher) => {
    let nextPitcher = pitcher;

    if (
      selection.QS &&
      missingSets.QS.has(pitcher._id) &&
      (nextPitcher.QS ?? 0) <= 0
    ) {
      didChange = true;
      nextPitcher = {
        ...nextPitcher,
        QS: estimateQualityStarts(
          {
            GS: nextPitcher.GS,
            G: nextPitcher.G,
            IP: nextPitcher.IP,
            ERA: nextPitcher.ERA,
            W: nextPitcher.W,
            FIP: nextPitcher.FIP,
            WHIP: nextPitcher.WHIP,
            "K/9": nextPitcher["K/9"],
            "BB/9": nextPitcher["BB/9"],
          },
          undefined,
          useBaseballIp
        ),
      };
    }

    if (
      selection.CG &&
      missingSets.CG.has(pitcher._id) &&
      (nextPitcher.CG ?? 0) <= 0
    ) {
      didChange = true;
      nextPitcher = {
        ...nextPitcher,
        CG: estimateCompleteGames(
          {
            GS: nextPitcher.GS,
            G: nextPitcher.G,
            IP: nextPitcher.IP,
            ERA: nextPitcher.ERA,
            FIP: nextPitcher.FIP,
            WHIP: nextPitcher.WHIP,
            "K/9": nextPitcher["K/9"],
            "BB/9": nextPitcher["BB/9"],
          },
          undefined,
          useBaseballIp
        ),
      };
    }

    if (
      selection.ShO &&
      missingSets.ShO.has(pitcher._id) &&
      (nextPitcher.ShO ?? 0) <= 0
    ) {
      const cgForShutout =
        (nextPitcher.CG ?? 0) > 0
          ? nextPitcher.CG
          : estimateCompleteGames(
              {
                GS: nextPitcher.GS,
                G: nextPitcher.G,
                IP: nextPitcher.IP,
                ERA: nextPitcher.ERA,
                FIP: nextPitcher.FIP,
                WHIP: nextPitcher.WHIP,
                "K/9": nextPitcher["K/9"],
                "BB/9": nextPitcher["BB/9"],
              },
              undefined,
              useBaseballIp
            );

      didChange = true;
      nextPitcher = {
        ...nextPitcher,
        ShO: estimateShutouts(
          {
            GS: nextPitcher.GS,
            G: nextPitcher.G,
            IP: nextPitcher.IP,
            ERA: nextPitcher.ERA,
            CG: cgForShutout,
            FIP: nextPitcher.FIP,
            WHIP: nextPitcher.WHIP,
            "K/9": nextPitcher["K/9"],
            "BB/9": nextPitcher["BB/9"],
          },
          undefined,
          useBaseballIp
        ),
      };
    }

    return nextPitcher;
  });

  return didChange ? updatedPitchers : pitchers;
}
