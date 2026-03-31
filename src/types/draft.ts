export type DraftFormat = "snake";

export interface DraftPick {
  playerId: string;
  teamIndex: number;
  slotIndex: number;
  overallPick: number;
  round: number;
  pickInRound: number;
  timestamp: number;
}

// Draft state
export interface DraftState {
  format: DraftFormat;
  draftedByTeam: Record<string, string>;
  keeperByTeam: Record<string, string>;
  keeperSlotByPlayer: Record<string, number | null>;
  pickIndex: number;
  history: DraftPick[];
}
