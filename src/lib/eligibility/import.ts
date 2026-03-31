import {
  computeHitterEligibility,
  computePitcherEligibility,
  eligibilityFromProfilePosition,
  emptyPositionGames,
  mergeTwoWayEligibility,
  mergeWarnings,
} from "./rules";
import { fetchSeasonStatsForPlayers } from "./mlbStatsApi";
import type { Eligibility, ProjectionGroup } from "@/types";

type RetryState = {
  attempt: number;
  delayMs: number;
  status?: number;
};

export type ProjectionEligibilityImportCallbacks = {
  onStart?: () => void;
  onProgress?: (progress: number) => void;
  onPlayer?: (name: string) => void;
  onRetryStatus?: (label: string | null) => void;
  onError?: (message: string | null) => void;
  onComplete?: (success: boolean) => void;
};

type ProjectionEligibilityImportParams = {
  group: ProjectionGroup;
  season: number;
  applyEligibilityForGroup: (
    groupId: string,
    eligibilityById: Map<string, Eligibility>,
    season: number
  ) => void;
  callbacks?: ProjectionEligibilityImportCallbacks;
};

export async function runProjectionEligibilityImport({
  group,
  season,
  applyEligibilityForGroup,
  callbacks,
}: ProjectionEligibilityImportParams): Promise<boolean> {
  const batters = group.batters ?? [];
  const pitchers = group.pitchers ?? [];
  const twoWayPlayers = group.twoWayPlayers ?? [];
  const players = [...batters, ...pitchers, ...twoWayPlayers];

  callbacks?.onStart?.();
  callbacks?.onProgress?.(0);
  callbacks?.onPlayer?.("");
  callbacks?.onError?.(null);
  callbacks?.onRetryStatus?.(null);

  try {
    const retryOptions = {
      onRetry: ({ attempt, delayMs, status }: RetryState) => {
        const statusLabel = status ? `status ${status}` : "network error";
        callbacks?.onRetryStatus?.(
          `Retry ${attempt} in ${(delayMs / 1000).toFixed(1)}s (${statusLabel})`
        );
      },
    };

    if (players.length === 0) {
      callbacks?.onProgress?.(100);
      applyEligibilityForGroup(group.id, new Map(), season);
      callbacks?.onComplete?.(true);
      return true;
    }

    const mlbIds = players
      .map((player) => player.MLBAMID)
      .filter((id) => typeof id === "string" && id.trim().length > 0);

    const {
      fieldingById: fieldingMap,
      pitchingById: pitchingMap,
      primaryPositionById,
    } = await fetchSeasonStatsForPlayers(mlbIds, season, retryOptions);

    const eligibilityById = new Map<string, Eligibility>();

    for (let i = 0; i < players.length; i += 1) {
      const player = players[i];
      callbacks?.onPlayer?.(player.Name);
      const warnings: string[] = [];

      if (!player.MLBAMID) {
        warnings.push("Missing MLBAMID");
      }

      if (player._type === "batter") {
        const fielding = player.MLBAMID ? fieldingMap.get(player.MLBAMID) : undefined;
        const profilePosition = player.MLBAMID
          ? primaryPositionById.get(player.MLBAMID)
          : undefined;
        const hasFielding = fielding && Object.values(fielding).some((value) => value > 0);

        if (!hasFielding && profilePosition) {
          warnings.push(`Profile fallback: ${profilePosition}`);
          eligibilityById.set(
            player._id,
            eligibilityFromProfilePosition(profilePosition, season, warnings)
          );
        } else {
          if (!hasFielding) warnings.push("No fielding stats found");
          eligibilityById.set(
            player._id,
            computeHitterEligibility(fielding ?? emptyPositionGames(), season, warnings)
          );
        }
      } else if (player._type === "pitcher") {
        const pitching = player.MLBAMID ? pitchingMap.get(player.MLBAMID) : undefined;
        const profilePosition = player.MLBAMID
          ? primaryPositionById.get(player.MLBAMID)
          : undefined;

        if (!pitching && profilePosition) {
          warnings.push(`Profile fallback: ${profilePosition}`);
          eligibilityById.set(
            player._id,
            eligibilityFromProfilePosition(profilePosition, season, warnings)
          );
        } else {
          if (!pitching) warnings.push("No pitching stats found");
          eligibilityById.set(
            player._id,
            computePitcherEligibility(pitching ?? { G: 0, GS: 0 }, season, warnings)
          );
        }
      } else {
        const battingWarnings: string[] = [];
        const pitchingWarnings: string[] = [];

        if (!player.MLBAMID) {
          battingWarnings.push("Missing MLBAMID");
          pitchingWarnings.push("Missing MLBAMID");
        }

        const fielding = player.MLBAMID ? fieldingMap.get(player.MLBAMID) : undefined;
        const profilePosition = player.MLBAMID
          ? primaryPositionById.get(player.MLBAMID)
          : undefined;
        const hasFielding = fielding && Object.values(fielding).some((value) => value > 0);

        let battingEligibility: Eligibility;
        if (!hasFielding && profilePosition) {
          battingWarnings.push(`Profile fallback: ${profilePosition}`);
          battingEligibility = eligibilityFromProfilePosition(
            profilePosition,
            season,
            battingWarnings
          );
        } else {
          if (!hasFielding) battingWarnings.push("No fielding stats found");
          battingEligibility = computeHitterEligibility(
            fielding ?? emptyPositionGames(),
            season,
            battingWarnings
          );
        }

        const pitching = player.MLBAMID ? pitchingMap.get(player.MLBAMID) : undefined;
        let pitchingEligibility: Eligibility;
        if (!pitching && profilePosition) {
          pitchingWarnings.push(`Profile fallback: ${profilePosition}`);
          pitchingEligibility = eligibilityFromProfilePosition(
            profilePosition,
            season,
            pitchingWarnings
          );
        } else {
          if (!pitching) pitchingWarnings.push("No pitching stats found");
          pitchingEligibility = computePitcherEligibility(
            pitching ?? { G: 0, GS: 0 },
            season,
            pitchingWarnings
          );
        }

        const merged = mergeTwoWayEligibility(battingEligibility, pitchingEligibility);
        merged.warnings = mergeWarnings(
          battingEligibility.warnings,
          pitchingEligibility.warnings
        );
        eligibilityById.set(player._id, merged);
      }

      callbacks?.onProgress?.(Math.round(((i + 1) / players.length) * 100));

      if (i % 25 === 0) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    }

    applyEligibilityForGroup(group.id, eligibilityById, season);
    callbacks?.onComplete?.(true);
    return true;
  } catch (error) {
    callbacks?.onError?.(
      error instanceof Error ? error.message : "Failed to import eligibility"
    );
    callbacks?.onComplete?.(false);
    return false;
  } finally {
    callbacks?.onRetryStatus?.(null);
    callbacks?.onPlayer?.("");
  }
}
