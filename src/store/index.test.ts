import { describe, expect, it } from "bun:test";
import type { ProjectionGroup } from "@/types";
import { migrateDraftState } from "@/store";

function createUploadGroup(id = "upload-group"): ProjectionGroup {
  return {
    id,
    name: `Upload ${id}`,
    createdAt: "2026-03-22T00:00:00.000Z",
    source: { kind: "upload" },
    batters: [],
    pitchers: [],
    twoWayPlayers: [],
    batterIdSource: "MLBAMID",
    pitcherIdSource: "MLBAMID",
  };
}

function createProtectedPublicGroup(id = "public-group"): ProjectionGroup {
  return {
    id,
    name: "2025 Prior-Year Stats",
    createdAt: "2026-03-22T00:00:00.000Z",
    source: {
      kind: "public-dataset",
      slug: "historical-2025",
      season: 2025,
      datasetType: "historical-stats",
      protected: true,
      seededAt: "2026-03-22T12:00:00.000Z",
    },
    batters: [],
    pitchers: [],
    twoWayPlayers: [],
    batterIdSource: "MLBAMID",
    pitcherIdSource: "MLBAMID",
  };
}

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

describe("public dataset protection", () => {
  it("migrates legacy v6 projection groups to upload sources", async () => {
    const storeModule = await import("@/store");
    const migrate = storeModule.useStore.persist.getOptions().migrate;

    if (!migrate) throw new Error("expected persist migrate function");

    const migrated = await migrate(
      {
        leagues: [storeModule.useStore.getState().getActiveLeague()],
        activeLeagueId: storeModule.useStore.getState().getActiveLeague()!.id,
        projectionGroups: [
          {
            id: "legacy-group",
            name: "Legacy",
            createdAt: "2026-03-22T00:00:00.000Z",
            batters: [],
            pitchers: [],
            twoWayPlayers: [],
            batterIdSource: "MLBAMID",
            pitcherIdSource: "MLBAMID",
          },
        ],
        activeProjectionGroupId: "legacy-group",
        isDraftMode: false,
        mergeTwoWayRankings: true,
      },
      6
    );

    expect(migrated.projectionGroups[0]?.source).toEqual({ kind: "upload" });
  });

  it("does not remove protected public groups", async () => {
    const storeModule = await import("@/store");
    const activeLeague = storeModule.useStore.getState().getActiveLeague();

    if (!activeLeague) throw new Error("expected active league");

    storeModule.useStore.setState({
      leagues: [activeLeague],
      activeLeagueId: activeLeague.id,
      projectionGroups: [createProtectedPublicGroup(), createUploadGroup()],
      activeProjectionGroupId: "public-group",
    });

    storeModule.useStore.getState().removeProjectionGroup("public-group");

    expect(storeModule.useStore.getState().projectionGroups.map((group) => group.id)).toEqual([
      "public-group",
      "upload-group",
    ]);
  });

  it("clears only uploaded groups while preserving the protected baseline", async () => {
    const storeModule = await import("@/store");
    const activeLeague = storeModule.useStore.getState().getActiveLeague();

    if (!activeLeague) throw new Error("expected active league");

    storeModule.useStore.setState({
      leagues: [activeLeague],
      activeLeagueId: activeLeague.id,
      projectionGroups: [createUploadGroup("upload-a"), createProtectedPublicGroup("public-a")],
      activeProjectionGroupId: "upload-a",
    });

    storeModule.useStore.getState().clearProjectionGroups();

    expect(storeModule.useStore.getState().projectionGroups.map((group) => group.id)).toEqual([
      "public-a",
    ]);
    expect(storeModule.useStore.getState().activeProjectionGroupId).toBe("public-a");
  });

  it("preserves the protected baseline when clearing all data and resets draft state", async () => {
    const storeModule = await import("@/store");
    const activeLeague = storeModule.useStore.getState().getActiveLeague();

    if (!activeLeague) throw new Error("expected active league");

    storeModule.useStore.setState({
      leagues: [
        {
          ...activeLeague,
          draftState: {
            format: "snake",
            draftedByTeam: { "player-1": "0" },
            keeperByTeam: { "keeper-1": "0" },
            keeperSlotByPlayer: { "keeper-1": 0 },
            pickIndex: 1,
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
            ],
          },
        },
      ],
      activeLeagueId: activeLeague.id,
      projectionGroups: [createProtectedPublicGroup("public-a"), createUploadGroup("upload-a")],
      activeProjectionGroupId: "upload-a",
    });

    storeModule.useStore.getState().clearAllData();

    const state = storeModule.useStore.getState();
    expect(state.projectionGroups.map((group) => group.id)).toEqual(["public-a"]);
    expect(state.activeProjectionGroupId).toBe("public-a");
    expect(state.getActiveLeague()!.draftState).toEqual({
      format: "snake",
      draftedByTeam: {},
      keeperByTeam: {},
      keeperSlotByPlayer: {},
      pickIndex: 0,
      history: [],
    });
  });

  it("renames uploaded groups but not protected public groups", async () => {
    const storeModule = await import("@/store");
    const activeLeague = storeModule.useStore.getState().getActiveLeague();

    if (!activeLeague) throw new Error("expected active league");

    storeModule.useStore.setState({
      leagues: [activeLeague],
      activeLeagueId: activeLeague.id,
      projectionGroups: [createUploadGroup("upload-a"), createProtectedPublicGroup("public-a")],
      activeProjectionGroupId: "upload-a",
    });

    storeModule.useStore.getState().renameProjectionGroup("upload-a", "Steamer");
    storeModule.useStore.getState().renameProjectionGroup("public-a", "Nope");

    expect(storeModule.useStore.getState().projectionGroups.map((group) => group.name)).toEqual([
      "Steamer",
      "2025 Prior-Year Stats",
    ]);
  });

  it("stores a per-group eligibility import season", async () => {
    const storeModule = await import("@/store");
    const activeLeague = storeModule.useStore.getState().getActiveLeague();

    if (!activeLeague) throw new Error("expected active league");

    storeModule.useStore.setState({
      leagues: [activeLeague],
      activeLeagueId: activeLeague.id,
      projectionGroups: [createUploadGroup("upload-a"), createProtectedPublicGroup("public-a")],
      activeProjectionGroupId: "upload-a",
    });

    storeModule.useStore.getState().setProjectionGroupEligibilityImportSeason("upload-a", 2024);
    storeModule.useStore.getState().setProjectionGroupEligibilityImportSeason("public-a", 2023);

    expect(
      storeModule.useStore.getState().projectionGroups.map((group) => group.eligibilityImportSeason)
    ).toEqual([2024, 2023]);
  });
});
