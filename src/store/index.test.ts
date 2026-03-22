import { describe, expect, it } from "bun:test";
import { migrateDraftState } from "@/store";

describe("migrateDraftState", () => {
  it("preserves drafted and keeper ownership while deriving pick index from non-keeper picks", () => {
    const migrated = migrateDraftState({
      draftedByTeam: {
        "player-1": "0",
        "player-2": "1",
      },
      keeperByTeam: {
        "player-2": "1",
        "player-3": "0",
      },
      activeTeamIndex: 1,
    });

    expect(migrated.format).toBe("snake");
    expect(migrated.draftedByTeam).toEqual({
      "player-1": "0",
      "player-2": "1",
    });
    expect(migrated.keeperByTeam).toEqual({
      "player-2": "1",
      "player-3": "0",
    });
    expect(migrated.keeperSlotByPlayer).toEqual({});
    expect(migrated.pickIndex).toBe(1);
    expect(migrated.history).toEqual([]);
  });

  it("trusts history length over legacy pick index", () => {
    const migrated = migrateDraftState({
      pickIndex: 9,
      history: [
        {
          playerId: "player-1",
          teamIndex: 0,
          slotIndex: 0,
          overallPick: 1,
          round: 1,
          pickInRound: 1,
          timestamp: 1,
        },
        {
          playerId: "player-2",
          teamIndex: 1,
          slotIndex: 1,
          overallPick: 2,
          round: 1,
          pickInRound: 2,
          timestamp: 2,
        },
      ],
    });

    expect(migrated.pickIndex).toBe(2);
    expect(migrated.history).toHaveLength(2);
  });
});

describe("draft setup structure changes", () => {
  it("blocks pure team-order reorders once manual draft picks exist", async () => {
    const storeModule = await import("@/store");
    const current = storeModule.useStore.getState();
    const activeLeague = current.getActiveLeague();

    if (!activeLeague) throw new Error("expected active league");

    storeModule.useStore.setState({
      leagues: [
        {
          ...activeLeague,
          leagueSettings: {
            ...activeLeague.leagueSettings,
            leagueSize: 3,
            teamNames: ["Team 1", "Team 2", "Team 3"],
          },
          draftState: {
            format: "snake",
            draftedByTeam: { "player-1": "0" },
            keeperByTeam: {},
            keeperSlotByPlayer: {},
            pickIndex: 1,
            history: [],
          },
        },
      ],
      activeLeagueId: activeLeague.id,
    });

    storeModule.useStore.getState().setLeagueSettings({
      ...storeModule.useStore.getState().getActiveLeague()!.leagueSettings,
      teamNames: ["Team 2", "Team 1", "Team 3"],
    });

    expect(storeModule.useStore.getState().getActiveLeague()!.leagueSettings.teamNames).toEqual([
      "Team 1",
      "Team 2",
      "Team 3",
    ]);
  });

  it("allows team-order reorders when only keepers exist", async () => {
    const storeModule = await import("@/store");
    const current = storeModule.useStore.getState();
    const activeLeague = current.getActiveLeague();

    if (!activeLeague) throw new Error("expected active league");

    storeModule.useStore.setState({
      leagues: [
        {
          ...activeLeague,
          leagueSettings: {
            ...activeLeague.leagueSettings,
            leagueSize: 3,
            teamNames: ["Team 1", "Team 2", "Team 3"],
          },
          draftState: {
            format: "snake",
            draftedByTeam: {},
            keeperByTeam: { "keeper-1": "0" },
            keeperSlotByPlayer: { "keeper-1": 0 },
            pickIndex: 1,
            history: [],
          },
        },
      ],
      activeLeagueId: activeLeague.id,
    });

    storeModule.useStore.getState().setLeagueSettings({
      ...storeModule.useStore.getState().getActiveLeague()!.leagueSettings,
      teamNames: ["Team 2", "Team 1", "Team 3"],
    });

    expect(storeModule.useStore.getState().getActiveLeague()!.leagueSettings.teamNames).toEqual([
      "Team 2",
      "Team 1",
      "Team 3",
    ]);
  });
});

describe("resetDraft", () => {
  it("clears only manual draft picks and preserves keepers for the active league", async () => {
    const storeModule = await import("@/store");
    const current = storeModule.useStore.getState();
    const activeLeague = current.getActiveLeague();

    if (!activeLeague) throw new Error("expected active league");

    storeModule.useStore.setState({
      leagues: [
        {
          ...activeLeague,
          leagueSettings: {
            ...activeLeague.leagueSettings,
            leagueSize: 3,
            teamNames: ["Team 1", "Team 2", "Team 3"],
          },
          draftState: {
            format: "snake",
            draftedByTeam: { "pick-1": "1" },
            keeperByTeam: { "keeper-1": "0" },
            keeperSlotByPlayer: { "keeper-1": 0 },
            pickIndex: 2,
            history: [
              {
                playerId: "pick-1",
                teamIndex: 1,
                slotIndex: 1,
                overallPick: 2,
                round: 1,
                pickInRound: 2,
                timestamp: 1,
              },
            ],
          },
        },
      ],
      activeLeagueId: activeLeague.id,
    });

    storeModule.useStore.getState().resetDraft();

    const draftState = storeModule.useStore.getState().getActiveLeague()!.draftState;
    expect(draftState.draftedByTeam).toEqual({});
    expect(draftState.history).toEqual([]);
    expect(draftState.keeperByTeam).toEqual({ "keeper-1": "0" });
    expect(draftState.keeperSlotByPlayer).toEqual({ "keeper-1": 0 });
    expect(draftState.pickIndex).toBe(1);
  });
});

describe("keeper slot cursor normalization", () => {
  it("rewinds the live cursor when a pre-draft keeper moves from round 1 to a later round", async () => {
    const storeModule = await import("@/store");
    const current = storeModule.useStore.getState();
    const activeLeague = current.getActiveLeague();

    if (!activeLeague) throw new Error("expected active league");

    storeModule.useStore.setState({
      leagues: [
        {
          ...activeLeague,
          leagueSettings: {
            ...activeLeague.leagueSettings,
            leagueSize: 3,
            teamNames: ["Team 1", "Team 2", "Team 3"],
          },
          draftState: {
            format: "snake",
            draftedByTeam: {},
            keeperByTeam: { "keeper-1": "0" },
            keeperSlotByPlayer: { "keeper-1": 0 },
            pickIndex: 1,
            history: [],
          },
        },
      ],
      activeLeagueId: activeLeague.id,
    });

    storeModule.useStore.getState().setKeeperForTeam("keeper-1", 0, 3);

    const draftState = storeModule.useStore.getState().getActiveLeague()!.draftState;
    expect(draftState.keeperSlotByPlayer["keeper-1"]).toBe(6);
    expect(draftState.pickIndex).toBe(0);
  });
});
