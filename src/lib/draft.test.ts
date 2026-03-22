import { describe, expect, it } from "bun:test";
import {
  countManualDraftPicks,
  createDraftPick,
  findNextAvailableKeeperRound,
  getDraftPickContext,
  hasDraftActivity,
  hasManualDraftActivity,
} from "@/lib/draft";
import type { DraftState } from "@/types";

function createDraftState(overrides: Partial<DraftState> = {}): DraftState {
  return {
    format: "snake",
    draftedByTeam: {},
    keeperByTeam: {},
    keeperSlotByPlayer: {},
    pickIndex: 0,
    history: [],
    ...overrides,
  };
}

describe("draft helpers", () => {
  it("derives snake order across multiple rounds", () => {
    expect(getDraftPickContext(3, 0)).toMatchObject({
      overallPick: 1,
      round: 1,
      pickInRound: 1,
      teamIndex: 0,
      nextTeamIndex: 1,
    });
    expect(getDraftPickContext(3, 2)).toMatchObject({
      overallPick: 3,
      round: 1,
      pickInRound: 3,
      teamIndex: 2,
      nextTeamIndex: 2,
    });
    expect(getDraftPickContext(3, 3)).toMatchObject({
      overallPick: 4,
      round: 2,
      pickInRound: 1,
      teamIndex: 2,
      nextTeamIndex: 1,
    });
    expect(getDraftPickContext(3, 5)).toMatchObject({
      overallPick: 6,
      round: 2,
      pickInRound: 3,
      teamIndex: 0,
      nextTeamIndex: 0,
    });
  });

  it("counts manual picks from history", () => {
    const state = createDraftState({
      pickIndex: 2,
      history: [
        createDraftPick("player-1", 0, 0, { overallPick: 1, round: 1, pickInRound: 1, teamIndex: 0 }),
        createDraftPick("player-2", 1, 1, { overallPick: 2, round: 1, pickInRound: 2, teamIndex: 1 }),
      ],
    });

    expect(countManualDraftPicks(state)).toBe(2);
  });

  it("detects draft activity from drafted players or keepers", () => {
    expect(hasDraftActivity(createDraftState())).toBe(false);
    expect(
      hasDraftActivity(createDraftState({ draftedByTeam: { "player-1": "0" } }))
    ).toBe(true);
    expect(
      hasDraftActivity(createDraftState({ keeperByTeam: { "player-2": "1" } }))
    ).toBe(true);
  });

  it("treats only manual picks as structural draft activity", () => {
    expect(hasManualDraftActivity(createDraftState())).toBe(false);
    expect(
      hasManualDraftActivity(createDraftState({ keeperByTeam: { "player-2": "1" } }))
    ).toBe(false);
    expect(
      hasManualDraftActivity(createDraftState({ draftedByTeam: { "player-1": "0" } }))
    ).toBe(true);
    expect(
      hasManualDraftActivity(
        createDraftState({
          draftedByTeam: { "player-1": "0", "player-2": "1" },
          keeperByTeam: { "player-2": "1" },
        })
      )
    ).toBe(true);
  });

  it("finds the next open keeper round in either direction", () => {
    expect(
      findNextAvailableKeeperRound({
        leagueSize: 12,
        currentRound: 5,
        teamIndex: 0,
        direction: "later",
        occupiedRounds: [6],
        maxRound: 20,
        pickIndex: 0,
      })
    ).toBe(7);

    expect(
      findNextAvailableKeeperRound({
        leagueSize: 12,
        currentRound: 6,
        teamIndex: 0,
        direction: "earlier",
        occupiedRounds: [5],
        maxRound: 20,
        pickIndex: 0,
      })
    ).toBe(4);
  });

  it("returns null when no valid keeper round remains in that direction", () => {
    expect(
      findNextAvailableKeeperRound({
        leagueSize: 12,
        currentRound: 1,
        teamIndex: 0,
        direction: "earlier",
        occupiedRounds: [],
        maxRound: 20,
        pickIndex: 0,
      })
    ).toBeNull();

    expect(
      findNextAvailableKeeperRound({
        leagueSize: 12,
        currentRound: 6,
        teamIndex: 0,
        direction: "earlier",
        occupiedRounds: [5, 4],
        maxRound: 20,
        pickIndex: 48,
      })
    ).toBeNull();
  });
});
