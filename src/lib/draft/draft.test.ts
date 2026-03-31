import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  advancePick,
  canEditDraftSetup,
  countManualDraftPicks,
  createDraftPick,
  findNextAvailableKeeperRound,
  getDraftCursorBase,
  getDraftPickContext,
  getNextOpenPickIndex,
  getPickContext,
  hasDraftActivity,
  hasManualDraftActivity,
  migrateDraftState,
  removeKeeper,
  resetDraft,
  setKeeper,
  undoLastPick,
} from "@/lib/draft";
import type { DraftState } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function createEmptyDraftState(): DraftState {
  return createDraftState();
}

// ---------------------------------------------------------------------------
// Original tests (migrated from src/lib/draft.test.ts)
// ---------------------------------------------------------------------------

describe("draft helpers", () => {
  test("derives snake order across multiple rounds", () => {
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

  test("counts manual picks from history", () => {
    const state = createDraftState({
      pickIndex: 2,
      history: [
        createDraftPick("player-1", 0, 0, { overallPick: 1, round: 1, pickInRound: 1, teamIndex: 0 }),
        createDraftPick("player-2", 1, 1, { overallPick: 2, round: 1, pickInRound: 2, teamIndex: 1 }),
      ],
    });

    expect(countManualDraftPicks(state)).toBe(2);
  });

  test("detects draft activity from drafted players or keepers", () => {
    expect(hasDraftActivity(createDraftState())).toBe(false);
    expect(
      hasDraftActivity(createDraftState({ draftedByTeam: { "player-1": "0" } }))
    ).toBe(true);
    expect(
      hasDraftActivity(createDraftState({ keeperByTeam: { "player-2": "1" } }))
    ).toBe(true);
  });

  test("treats only manual picks as structural draft activity", () => {
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

  test("finds the next open keeper round in either direction", () => {
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

  test("returns null when no valid keeper round remains in that direction", () => {
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

// ---------------------------------------------------------------------------
// New tests: migrateDraftState
// ---------------------------------------------------------------------------

describe("migrateDraftState", () => {
  test("handles undefined input", () => {
    const result = migrateDraftState(undefined);
    expect(result).toEqual({
      format: "snake",
      draftedByTeam: {},
      keeperByTeam: {},
      keeperSlotByPlayer: {},
      pickIndex: 0,
      history: [],
    });
  });

  test("handles null input", () => {
    const result = migrateDraftState(null);
    expect(result).toEqual({
      format: "snake",
      draftedByTeam: {},
      keeperByTeam: {},
      keeperSlotByPlayer: {},
      pickIndex: 0,
      history: [],
    });
  });

  test("preserves valid draft state fields", () => {
    const input = {
      format: "snake" as const,
      draftedByTeam: { "p1": "0" },
      keeperByTeam: { "p2": "1" },
      keeperSlotByPlayer: { "p2": 3 },
      pickIndex: 5,
      history: [],
    };
    const result = migrateDraftState(input);
    expect(result.draftedByTeam).toEqual({ "p1": "0" });
    expect(result.keeperByTeam).toEqual({ "p2": "1" });
    expect(result.keeperSlotByPlayer).toEqual({ "p2": 3 });
    expect(result.pickIndex).toBe(5);
  });

  test("strips legacy activeTeamIndex field", () => {
    const result = migrateDraftState({ activeTeamIndex: 3 });
    expect(result).not.toHaveProperty("activeTeamIndex");
  });

  test("computes fallback pickIndex from non-keeper drafted count", () => {
    const result = migrateDraftState({
      draftedByTeam: { "p1": "0", "p2": "1" },
      keeperByTeam: { "p2": "1" },
    });
    // Only p1 is a non-keeper draft pick, so fallbackPickIndex = 1
    expect(result.pickIndex).toBe(1);
  });

  test("uses history cursor when history is present", () => {
    const pick = createDraftPick("p1", 0, 7, {
      overallPick: 8,
      round: 1,
      pickInRound: 8,
      teamIndex: 0,
    });
    const result = migrateDraftState({
      history: [pick],
      pickIndex: 3,
    });
    // historyCursor = 7, so pickIndex = max(7+1, 3) = 8
    expect(result.pickIndex).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// New tests: getDraftCursorBase
// ---------------------------------------------------------------------------

describe("getDraftCursorBase", () => {
  test("returns 0 for empty draft state", () => {
    expect(getDraftCursorBase(createEmptyDraftState())).toBe(0);
  });

  test("returns slot after last pick when history exists", () => {
    const pick = createDraftPick("p1", 0, 5, {
      overallPick: 6,
      round: 1,
      pickInRound: 6,
      teamIndex: 0,
    });
    const state = createDraftState({ history: [pick], pickIndex: 10 });
    expect(getDraftCursorBase(state)).toBe(6); // slotIndex(5) + 1
  });

  test("returns pickIndex when manual progress exists but no history", () => {
    const state = createDraftState({
      draftedByTeam: { "p1": "0" },
      pickIndex: 3,
    });
    expect(getDraftCursorBase(state)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// New tests: canEditDraftSetup
// ---------------------------------------------------------------------------

describe("canEditDraftSetup", () => {
  test("returns true for empty draft state", () => {
    expect(canEditDraftSetup(createEmptyDraftState())).toBe(true);
  });

  test("returns true when only keepers exist", () => {
    const state = createDraftState({
      draftedByTeam: { "p1": "0" },
      keeperByTeam: { "p1": "0" },
    });
    expect(canEditDraftSetup(state)).toBe(true);
  });

  test("returns false when manual draft activity exists", () => {
    const state = createDraftState({
      draftedByTeam: { "p1": "0" },
    });
    expect(canEditDraftSetup(state)).toBe(false);
  });

  test("returns false when mix of keepers and manual picks exist", () => {
    const state = createDraftState({
      draftedByTeam: { "p1": "0", "p2": "1" },
      keeperByTeam: { "p1": "0" },
    });
    expect(canEditDraftSetup(state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// New tests: advancePick
// ---------------------------------------------------------------------------

describe("advancePick", () => {
  test("marks player as drafted by correct team", () => {
    const state = createEmptyDraftState();
    const result = advancePick(state, "p1", 4);
    // First pick in a 4-team snake: team 0
    expect(result.draftedByTeam["p1"]).toBe("0");
  });

  test("appends a pick to history", () => {
    const state = createEmptyDraftState();
    const result = advancePick(state, "p1", 4);
    expect(result.history).toHaveLength(1);
    expect(result.history[0].playerId).toBe("p1");
    expect(result.history[0].teamIndex).toBe(0);
    expect(result.history[0].slotIndex).toBe(0);
  });

  test("advances cursor past the drafted slot", () => {
    const state = createEmptyDraftState();
    const result = advancePick(state, "p1", 4);
    expect(result.pickIndex).toBeGreaterThan(0);
  });

  test("returns original state if player is already drafted", () => {
    const state = createDraftState({
      draftedByTeam: { "p1": "0" },
    });
    const result = advancePick(state, "p1", 4);
    expect(result).toBe(state); // same reference
  });

  test("returns original state if player is a keeper", () => {
    const state = createDraftState({
      keeperByTeam: { "p1": "0" },
    });
    const result = advancePick(state, "p1", 4);
    expect(result).toBe(state);
  });

  test("assigns correct team for second pick in snake draft", () => {
    let state = createEmptyDraftState();
    state = advancePick(state, "p1", 3);
    state = advancePick(state, "p2", 3);
    // 3-team snake: pick 1 -> team 0, pick 2 -> team 1
    expect(state.draftedByTeam["p2"]).toBe("1");
  });

  test("skips keeper-reserved slots", () => {
    // Reserve slot 0 for a keeper
    const state = createDraftState({
      keeperByTeam: { "keeper1": "0" },
      keeperSlotByPlayer: { "keeper1": 0 },
    });
    const result = advancePick(state, "p1", 4);
    // Should skip slot 0 (reserved) and draft at slot 1
    expect(result.history[0].slotIndex).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// New tests: undoLastPick
// ---------------------------------------------------------------------------

describe("undoLastPick", () => {
  test("removes the last drafted player", () => {
    let state = createEmptyDraftState();
    state = advancePick(state, "p1", 4);
    state = advancePick(state, "p2", 4);

    const result = undoLastPick(state);
    expect(result.draftedByTeam["p2"]).toBeUndefined();
    expect(result.draftedByTeam["p1"]).toBe("0");
  });

  test("restores cursor to the undone pick slot", () => {
    let state = createEmptyDraftState();
    state = advancePick(state, "p1", 4);
    const slotAfterFirst = state.history[0].slotIndex;

    state = advancePick(state, "p2", 4);
    const result = undoLastPick(state);
    expect(result.pickIndex).toBe(state.history[1].slotIndex);
  });

  test("returns original state if history is empty", () => {
    const state = createEmptyDraftState();
    const result = undoLastPick(state);
    expect(result).toBe(state);
  });

  test("removes from history", () => {
    let state = createEmptyDraftState();
    state = advancePick(state, "p1", 4);
    state = advancePick(state, "p2", 4);
    expect(state.history).toHaveLength(2);

    const result = undoLastPick(state);
    expect(result.history).toHaveLength(1);
    expect(result.history[0].playerId).toBe("p1");
  });
});

// ---------------------------------------------------------------------------
// New tests: setKeeper
// ---------------------------------------------------------------------------

describe("setKeeper", () => {
  test("reserves the correct slot for a keeper", () => {
    const state = createEmptyDraftState();
    const result = setKeeper(state, "p1", 0, 1, 4);
    expect(result.keeperByTeam["p1"]).toBe("0");
    expect(result.keeperSlotByPlayer["p1"]).toBe(0); // round 1, team 0, 4-team = slot 0
  });

  test("removes player from draftedByTeam when set as keeper", () => {
    const state = createDraftState({
      draftedByTeam: { "p1": "0" },
    });
    const result = setKeeper(state, "p1", 0, 1, 4);
    expect(result.draftedByTeam["p1"]).toBeUndefined();
    expect(result.keeperByTeam["p1"]).toBe("0");
  });

  test("allows null round (no slot reservation)", () => {
    const state = createEmptyDraftState();
    const result = setKeeper(state, "p1", 2, null, 4);
    expect(result.keeperByTeam["p1"]).toBe("2");
    expect(result.keeperSlotByPlayer["p1"]).toBeNull();
  });

  test("clamps team index to valid range", () => {
    const state = createEmptyDraftState();
    const result = setKeeper(state, "p1", 10, 1, 4);
    // maxIndex = 3, so normalizedTeamIndex = 3
    expect(result.keeperByTeam["p1"]).toBe("3");
  });

  test("returns original state if slot already occupied by another keeper", () => {
    const state = createDraftState({
      keeperByTeam: { "k1": "0" },
      keeperSlotByPlayer: { "k1": 0 },
    });
    // Try to place another keeper in the same slot (round 1, team 0 -> slot 0)
    const result = setKeeper(state, "k2", 0, 1, 4);
    expect(result).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// New tests: removeKeeper
// ---------------------------------------------------------------------------

describe("removeKeeper", () => {
  test("clears keeper data for the player", () => {
    const state = createDraftState({
      keeperByTeam: { "p1": "0" },
      keeperSlotByPlayer: { "p1": 0 },
    });
    const result = removeKeeper(state, "p1", 4);
    expect(result.keeperByTeam["p1"]).toBeUndefined();
    expect(result.keeperSlotByPlayer["p1"]).toBeUndefined();
  });

  test("returns original state if player is not a keeper", () => {
    const state = createEmptyDraftState();
    const result = removeKeeper(state, "p1", 4);
    expect(result).toBe(state);
  });

  test("preserves other keepers when removing one", () => {
    const state = createDraftState({
      keeperByTeam: { "p1": "0", "p2": "1" },
      keeperSlotByPlayer: { "p1": 0, "p2": 1 },
    });
    const result = removeKeeper(state, "p1", 4);
    expect(result.keeperByTeam["p2"]).toBe("1");
    expect(result.keeperSlotByPlayer["p2"]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// New tests: resetDraft
// ---------------------------------------------------------------------------

describe("resetDraft", () => {
  test("keeps keepers but clears drafted players", () => {
    let state = createDraftState({
      keeperByTeam: { "k1": "0" },
      keeperSlotByPlayer: { "k1": 0 },
    });
    state = advancePick(state, "p1", 4);
    state = advancePick(state, "p2", 4);

    const result = resetDraft(state, 4);
    expect(result.draftedByTeam).toEqual({});
    expect(result.history).toEqual([]);
    expect(result.keeperByTeam).toEqual({ "k1": "0" });
    expect(result.keeperSlotByPlayer).toEqual({ "k1": 0 });
  });

  test("resets cursor, skipping keeper slots", () => {
    const state = createDraftState({
      keeperByTeam: { "k1": "0" },
      keeperSlotByPlayer: { "k1": 0 },
      draftedByTeam: { "p1": "1" },
      pickIndex: 5,
      history: [],
    });
    const result = resetDraft(state, 4);
    // Slot 0 is reserved by keeper, so cursor skips to 1
    expect(result.pickIndex).toBe(1);
  });

  test("resets to 0 when no keepers exist", () => {
    let state = createEmptyDraftState();
    state = advancePick(state, "p1", 4);

    const result = resetDraft(state, 4);
    expect(result.pickIndex).toBe(0);
    expect(result.draftedByTeam).toEqual({});
    expect(result.history).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// New tests: getPickContext
// ---------------------------------------------------------------------------

describe("getPickContext", () => {
  test("returns context for current pick index", () => {
    const state = createDraftState({ pickIndex: 0 });
    const ctx = getPickContext(state, 4);
    expect(ctx).not.toBeNull();
    expect(ctx!.overallPick).toBe(1);
    expect(ctx!.teamIndex).toBe(0);
  });

  test("returns null for invalid league size", () => {
    const state = createEmptyDraftState();
    expect(getPickContext(state, 0)).toBeNull();
    expect(getPickContext(state, -1)).toBeNull();
  });

  test("reflects advanced pick index", () => {
    let state = createEmptyDraftState();
    state = advancePick(state, "p1", 4);
    const ctx = getPickContext(state, 4);
    expect(ctx).not.toBeNull();
    expect(ctx!.overallPick).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe("property-based tests", () => {
  const leagueSizeArb = fc.integer({ min: 1, max: 32 });
  const playerIdArb = fc.uuid();

  test("advancePick increases history length by 1", () => {
    fc.assert(
      fc.property(leagueSizeArb, playerIdArb, (leagueSize, playerId) => {
        const state = createEmptyDraftState();
        const result = advancePick(state, playerId, leagueSize);
        expect(result.history.length).toBe(state.history.length + 1);
      })
    );
  });

  test("undoLastPick after advancePick restores original history length", () => {
    fc.assert(
      fc.property(leagueSizeArb, playerIdArb, (leagueSize, playerId) => {
        const state = createEmptyDraftState();
        const afterPick = advancePick(state, playerId, leagueSize);
        const afterUndo = undoLastPick(afterPick);
        expect(afterUndo.history.length).toBe(state.history.length);
      })
    );
  });

  test("team index in pick context is always in [0, leagueSize)", () => {
    fc.assert(
      fc.property(
        leagueSizeArb,
        fc.integer({ min: 0, max: 500 }),
        (leagueSize, pickIndex) => {
          const ctx = getDraftPickContext(leagueSize, pickIndex);
          expect(ctx.teamIndex).toBeGreaterThanOrEqual(0);
          expect(ctx.teamIndex).toBeLessThan(leagueSize);
        }
      )
    );
  });

  test("getNextOpenPickIndex >= input pickIndex", () => {
    fc.assert(
      fc.property(
        leagueSizeArb,
        fc.integer({ min: 0, max: 200 }),
        (leagueSize, pickIndex) => {
          const state = createEmptyDraftState();
          const result = getNextOpenPickIndex(leagueSize, pickIndex, "snake", state);
          expect(result).toBeGreaterThanOrEqual(pickIndex);
        }
      )
    );
  });

  test("advancePick then undoLastPick removes the drafted player", () => {
    fc.assert(
      fc.property(leagueSizeArb, playerIdArb, (leagueSize, playerId) => {
        const state = createEmptyDraftState();
        const afterPick = advancePick(state, playerId, leagueSize);
        expect(afterPick.draftedByTeam[playerId]).toBeDefined();
        const afterUndo = undoLastPick(afterPick);
        expect(afterUndo.draftedByTeam[playerId]).toBeUndefined();
      })
    );
  });
});
