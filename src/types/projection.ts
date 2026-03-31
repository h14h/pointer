import type { Player, TwoWayPlayer } from "./player";
import type { League } from "./league";

export type IdSource = "MLBAMID" | "PlayerId" | "custom" | "generated";

export type ProjectionGroupSource =
  | { kind: "upload" }
  | {
      kind: "public-dataset";
      slug: string;
      season: number;
      datasetType: "historical-stats";
      protected: true;
      seededAt: string;
    };

export type ProjectionGroup = {
  id: string;
  name: string;
  createdAt: string;
  source: ProjectionGroupSource;
  batters: Player[];
  pitchers: Player[];
  twoWayPlayers: TwoWayPlayer[];
  batterIdSource: IdSource | null;
  pitcherIdSource: IdSource | null;
  eligibilityImportSeason?: number;
  eligibilityImportedAt?: string;
  eligibilitySeason?: number;
};

// Player with calculated points for display
export interface RankedPlayer {
  player: Player;
  projectedPoints: number;
  par: number;
  isDrafted: boolean;
  isKeeper: boolean;
  draftedTeamIndex?: number;
  keeperTeamIndex?: number;
  keeperSlotIndex?: number | null;
}

// App state
export interface AppState {
  leagues: League[];
  activeLeagueId: string | null;
  projectionGroups: ProjectionGroup[];
  activeProjectionGroupId: string | null;
  isDraftMode: boolean;
}
