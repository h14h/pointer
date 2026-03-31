import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DraftSection } from "@/components/settings/DraftSection";
import { RosterSection } from "@/components/settings/RosterSection";
import { ScoringSection } from "@/components/settings/ScoringSection";
import type { LeagueSettings, ScoringSettings } from "@/types";

const useStoreMock = vi.fn();
const toastSpy = vi.fn();

vi.mock("@/store", () => ({
  useStore: () => useStoreMock(),
}));

vi.mock("@/lib/useDebounce", () => ({
  useDebouncedCallback: <T extends (...args: never[]) => void>(callback: T) => callback,
}));

vi.mock("sonner", () => ({
  toast: (...args: unknown[]) => toastSpy(...args),
}));

function createScoringSettings(): ScoringSettings {
  return {
    name: "Default",
    batting: {
      R: 1,
      H: 0,
      "1B": 1,
      "2B": 2,
      "3B": 3,
      HR: 4,
      RBI: 1,
      SB: 1,
      CS: -1,
      BB: 1,
      IBB: 0,
      SO: -1,
      HBP: 1,
      SF: 0,
      GDP: 0,
    },
    pitching: {
      IP: 3,
      W: 5,
      L: -5,
      QS: 3,
      CG: 0,
      ShO: 0,
      SV: 5,
      BS: -3,
      HLD: 2,
      SO: 1,
      H: -1,
      ER: -2,
      HR: -1,
      BB: -1,
      HBP: -1,
    },
  };
}

function createLeagueSettings(): LeagueSettings {
  return {
    leagueSize: 12,
    teamNames: Array.from({ length: 12 }, (_, index) => `Team ${index + 1}`),
    weeklyStartLimit: null,
    roster: {
      positions: {
        C: 1,
        "1B": 1,
        "2B": 1,
        "3B": 1,
        SS: 1,
        LF: 0,
        CF: 0,
        RF: 0,
        DH: 0,
        CI: 0,
        MI: 0,
        IF: 0,
        OF: 3,
        UTIL: 1,
        SP: 0,
        RP: 0,
        P: 7,
        IL: 0,
        NA: 0,
      },
      bench: 3,
    },
  };
}

function createBatter(id: string, name: string, team: string) {
  return {
    _type: "batter" as const,
    _id: id,
    Name: name,
    Team: team,
    PlayerId: id,
    MLBAMID: id,
    G: 0,
    PA: 0,
    AB: 0,
    H: 0,
    "1B": 0,
    "2B": 0,
    "3B": 0,
    HR: 0,
    R: 0,
    RBI: 0,
    BB: 0,
    IBB: 0,
    SO: 0,
    HBP: 0,
    SF: 0,
    SH: 0,
    GDP: 0,
    SB: 0,
    CS: 0,
    AVG: 0.25,
    OBP: 0.3,
    SLG: 0.4,
    OPS: 0.7,
    ISO: 0.15,
    BABIP: 0.3,
    "wRC+": 100,
    WAR: 0,
    ADP: null,
  };
}

describe("settings sections", () => {
  const updateLeagueSpy = vi.fn();
  const setMergeTwoWayRankingsSpy = vi.fn();
  const setKeeperSpy = vi.fn();
  const removeKeeperSpy = vi.fn();
  const resetDraftSpy = vi.fn();
  type TestLeague = {
    id: string;
    name: string;
    scoringSettings: ScoringSettings;
    leagueSettings: LeagueSettings;
    draftState: {
      format: "snake";
      draftedByTeam: Record<string, string>;
      keeperByTeam: Record<string, string>;
      keeperSlotByPlayer: Record<string, number>;
      pickIndex: number;
      history: Array<{
        playerId: string;
        teamIndex: number;
        slotIndex: number;
        overallPick: number;
        round: number;
        pickInRound: number;
        timestamp: number;
      }>;
    };
    updatedAt: number;
  };

  const createLeague = (overrides: Partial<TestLeague> = {}): TestLeague => ({
    id: "league-1",
    name: "My League",
    scoringSettings: createScoringSettings(),
    leagueSettings: createLeagueSettings(),
    draftState: {
      format: "snake",
      draftedByTeam: {},
      keeperByTeam: {},
      keeperSlotByPlayer: {},
      pickIndex: 0,
      history: [],
    },
    updatedAt: Date.now(),
    ...overrides,
  });

  const createStoreState = () => ({
    leagues: [createLeague()],
    activeLeagueId: "league-1",
    updateLeague: updateLeagueSpy,
    projectionGroups: [
      {
        id: "group-1",
        name: "Main Group",
        createdAt: "2026-02-11T00:00:00.000Z",
        source: { kind: "upload" },
        batters: [],
        pitchers: [],
        twoWayPlayers: [],
        batterIdSource: "MLBAMID",
        pitcherIdSource: "MLBAMID",
      },
    ],
    activeProjectionGroupId: "group-1",
    setKeeper: setKeeperSpy,
    removeKeeper: removeKeeperSpy,
    resetDraft: resetDraftSpy,
    mergeTwoWayRankings: true,
    setMergeTwoWayRankings: setMergeTwoWayRankingsSpy,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useStoreMock.mockReturnValue(createStoreState());
  });

  afterEach(() => {
    cleanup();
  });

  it("commits batting scoring changes", async () => {
    const user = userEvent.setup();
    render(<ScoringSection />);

    const hitsInput = screen.getByLabelText("Hits (H) - all types points");
    await user.click(hitsInput);
    await user.clear(hitsInput);
    await user.keyboard("7");
    await user.tab();

    expect(updateLeagueSpy).toHaveBeenCalled();
    const scoringCall = updateLeagueSpy.mock.calls.at(-1)?.[0] as { scoringSettings?: { batting?: { H?: number } } };
    expect(scoringCall.scoringSettings?.batting?.H).toBe(7);
  });

  it("commits roster slot and bench updates", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RosterSection />);

    const lfInput = screen.getByLabelText("Roster LF");
    await user.click(lfInput);
    await user.clear(lfInput);
    await user.keyboard("4");
    await user.tab();

    const lfCall = updateLeagueSpy.mock.calls.at(-1)?.[0] as { leagueSettings?: LeagueSettings };
    expect(lfCall.leagueSettings?.roster.positions.LF).toBe(4);

    const benchInput = screen.getByLabelText("Bench");
    await user.click(benchInput);
    await user.clear(benchInput);
    await user.keyboard("9");
    await user.tab();

    const benchCall = updateLeagueSpy.mock.calls.at(-1)?.[0] as { leagueSettings?: LeagueSettings };
    expect(benchCall.leagueSettings?.roster.bench).toBe(9);

    const weeklyStartLimitInput = screen.getByLabelText("Weekly Start Limit");
    expect(weeklyStartLimitInput).toBeDisabled();

    const weeklyStartLimitToggle = screen.getByRole("switch", {
      name: "Enable weekly start limit",
    });
    await user.click(weeklyStartLimitToggle);

    const enabledWeeklyStartLimitCall = updateLeagueSpy.mock.calls.at(-1)?.[0] as { leagueSettings?: LeagueSettings };
    const enabledWeeklyStartLimitLeagueSettings = enabledWeeklyStartLimitCall.leagueSettings!;
    expect(enabledWeeklyStartLimitLeagueSettings.weeklyStartLimit).toBe(12);

    useStoreMock.mockReturnValue({
      ...useStoreMock.mock.results.at(-1)?.value,
      leagues: [
        {
          ...createLeague(),
          leagueSettings: enabledWeeklyStartLimitLeagueSettings,
        },
      ],
    });
    rerender(<RosterSection />);

    expect(screen.getByLabelText("Weekly Start Limit")).not.toBeDisabled();
    await user.click(screen.getByLabelText("Weekly Start Limit"));
    await user.clear(screen.getByLabelText("Weekly Start Limit"));
    await user.keyboard("14");
    await user.tab();

    const weeklyStartLimitCall = updateLeagueSpy.mock.calls.at(-1)?.[0] as { leagueSettings?: LeagueSettings };
    expect(weeklyStartLimitCall.leagueSettings?.weeklyStartLimit).toBe(14);
  });

  it("applies draft controls for team management", async () => {
    const user = userEvent.setup();
    render(<DraftSection />);

    expect(screen.queryByLabelText("Search keepers for Team 1")).toBeNull();
    expect(screen.getAllByText("No Keepers")).toHaveLength(12);

    await user.click(screen.getAllByRole("button", { name: /Add team below/i })[0]);
    const addTeamCall = updateLeagueSpy.mock.calls.at(-1)?.[0] as { leagueSettings?: LeagueSettings };
    expect(addTeamCall.leagueSettings?.teamNames.length).toBe(13);

    await user.click(screen.getAllByRole("button", { name: /Remove/i })[0]);
    const removeTeamCall = updateLeagueSpy.mock.calls.at(-1)?.[0] as { leagueSettings?: LeagueSettings };
    expect(removeTeamCall.leagueSettings?.teamNames.length).toBe(11);

    const teamNameInput = screen.getByLabelText("Team 1 name");
    await user.clear(teamNameInput);
    await user.keyboard("My Team");
    await user.tab();

    const renameCall = updateLeagueSpy.mock.calls.at(-1)?.[0] as { leagueSettings?: LeagueSettings };
    expect(renameCall.leagueSettings?.teamNames[0]).toBe("My Team");
  });

  it("reorders a team when the draft position control changes", async () => {
    const user = userEvent.setup();
    render(<DraftSection />);

    await user.click(screen.getByRole("button", { name: "Draft position for Team 1" }));
    await user.click(screen.getByRole("button", { name: "3" }));

    const reorderCall = updateLeagueSpy.mock.calls.at(-1)?.[0] as { leagueSettings?: LeagueSettings };
    expect(reorderCall.leagueSettings?.teamNames.slice(0, 4)).toEqual([
      "Team 2",
      "Team 3",
      "Team 1",
      "Team 4",
    ]);
  });

  it("does not commit a reorder when the selected draft position is unchanged", async () => {
    const user = userEvent.setup();
    render(<DraftSection />);

    await user.click(screen.getByRole("button", { name: "Draft position for Team 1" }));
    await user.click(screen.getByRole("button", { name: "1" }));

    expect(updateLeagueSpy).not.toHaveBeenCalled();
  });

  it("expands a team to reveal keeper controls", async () => {
    const user = userEvent.setup();
    render(<DraftSection />);

    expect(screen.queryByLabelText("Search keepers for Team 1")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Show keepers for Team 1" }));

    expect(screen.getByLabelText("Search keepers for Team 1")).toBeVisible();
  });

  it("preserves the expanded team after reordering that team", async () => {
    const user = userEvent.setup();
    const leagueSettings = createLeagueSettings();
    leagueSettings.teamNames = ["Alpha", "Beta", "Gamma", "Delta", ...leagueSettings.teamNames.slice(4)];
    const { rerender } = render(<DraftSection />);

    useStoreMock.mockReturnValue({
      ...createStoreState(),
      leagues: [createLeague({ leagueSettings })],
    });
    rerender(<DraftSection />);

    await user.click(screen.getByRole("button", { name: "Show keepers for Beta" }));
    await user.click(screen.getByRole("button", { name: "Draft position for Beta" }));
    await user.click(screen.getByRole("button", { name: "4" }));

    const reorderCall = updateLeagueSpy.mock.calls.at(-1)?.[0] as { leagueSettings?: LeagueSettings };
    const reorderedLeagueSettings = reorderCall.leagueSettings!;

    useStoreMock.mockReturnValue({
      ...createStoreState(),
      leagues: [createLeague({ leagueSettings: reorderedLeagueSettings })],
    });
    rerender(<DraftSection />);

    expect(screen.getByLabelText("Search keepers for Beta")).toBeVisible();
    expect(screen.getByLabelText("Team 4 name")).toHaveValue("Beta");
  });

  it("shifts the expanded team index when another team moves around it", async () => {
    const user = userEvent.setup();
    const leagueSettings = createLeagueSettings();
    leagueSettings.teamNames = ["Alpha", "Beta", "Gamma", "Delta", ...leagueSettings.teamNames.slice(4)];
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      leagues: [createLeague({ leagueSettings })],
    });
    const { rerender } = render(<DraftSection />);

    await user.click(screen.getByRole("button", { name: "Show keepers for Gamma" }));
    await user.click(screen.getByRole("button", { name: "Draft position for Alpha" }));
    await user.click(screen.getByRole("button", { name: "4" }));

    const reorderCall2 = updateLeagueSpy.mock.calls.at(-1)?.[0] as { leagueSettings?: LeagueSettings };
    const reorderedLeagueSettings = reorderCall2.leagueSettings!;

    useStoreMock.mockReturnValue({
      ...createStoreState(),
      leagues: [createLeague({ leagueSettings: reorderedLeagueSettings })],
    });
    rerender(<DraftSection />);

    expect(screen.getByLabelText("Search keepers for Gamma")).toBeVisible();
    expect(screen.getByLabelText("Team 2 name")).toHaveValue("Gamma");
  });

  it("locks risky draft setup edits once manual picks exist", async () => {
    const user = userEvent.setup();
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      leagues: [
        {
          ...createLeague(),
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
    });

    render(<DraftSection />);

    expect(screen.getByText(/team order, add\/remove, and league size are locked/i)).toBeVisible();
    expect(screen.getByLabelText("League size")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Draft position for Team 1" })).toBeDisabled();

    await user.click(screen.getAllByRole("button", { name: /Add team below/i })[0]);
    expect(updateLeagueSpy).not.toHaveBeenCalled();

    const teamNameInput = screen.getByLabelText("Team 1 name");
    await user.clear(teamNameInput);
    await user.keyboard("Locked Team");
    await user.tab();

    const renamedCall = updateLeagueSpy.mock.calls.at(-1)?.[0] as { leagueSettings?: LeagueSettings };
    expect(renamedCall.leagueSettings?.teamNames[0]).toBe("Locked Team");
  });

  it("keeps structural draft setup edits available when only keepers exist", async () => {
    const user = userEvent.setup();
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      leagues: [
        {
          ...createLeague(),
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
    });

    render(<DraftSection />);

    expect(
      screen.queryByText(/team order, add\/remove, and league size are locked/i)
    ).toBeNull();
    expect(screen.getByLabelText("League size")).not.toBeDisabled();

    await user.click(screen.getAllByRole("button", { name: /Add team below/i })[0]);
    expect(updateLeagueSpy).toHaveBeenCalled();
  });

  it("keeps keeper editing available when draft setup is locked", async () => {
    const user = userEvent.setup();
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      projectionGroups: [
        {
          id: "group-1",
          name: "Main Group",
          createdAt: "2026-02-11T00:00:00.000Z",
          source: { kind: "upload" },
          batters: [createBatter("keeper-1", "Mookie Betts", "LAD"), createBatter("batter-1", "Mike Trout", "LAA")],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: "MLBAMID",
          pitcherIdSource: "MLBAMID",
        },
      ],
      leagues: [
        createLeague({
          draftState: {
            format: "snake",
            draftedByTeam: { "player-1": "0" },
            keeperByTeam: { "keeper-1": "0" },
            keeperSlotByPlayer: { "keeper-1": 0 },
            pickIndex: 1,
            history: [],
          },
        }),
      ],
    });

    render(<DraftSection />);

    await user.click(screen.getByRole("button", { name: "Show keepers for Team 1" }));
    await user.type(screen.getByLabelText("Search keepers for Team 1"), "mike");
    await user.click(screen.getByRole("button", { name: /Mike Trout/i }));
    await user.click(screen.getByRole("button", { name: "Remove keeper Mookie Betts" }));

    expect(setKeeperSpy).toHaveBeenCalledWith("batter-1", 0, 2);
    expect(removeKeeperSpy).toHaveBeenCalledWith("keeper-1");
  });

  it("assigns and removes keepers from the draft section", async () => {
    const user = userEvent.setup();
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      projectionGroups: [
        {
          id: "group-1",
          name: "Main Group",
          createdAt: "2026-02-11T00:00:00.000Z",
          source: { kind: "upload" },
          batters: [
            {
              _type: "batter",
              _id: "keeper-1",
              Name: "Mookie Betts",
              Team: "LAD",
              PlayerId: "9",
              MLBAMID: "9",
              G: 0,
              PA: 0,
              AB: 0,
              H: 0,
              "1B": 0,
              "2B": 0,
              "3B": 0,
              HR: 0,
              R: 0,
              RBI: 0,
              BB: 0,
              IBB: 0,
              SO: 0,
              HBP: 0,
              SF: 0,
              SH: 0,
              GDP: 0,
              SB: 0,
              CS: 0,
              AVG: 0.25,
              OBP: 0.3,
              SLG: 0.4,
              OPS: 0.7,
              ISO: 0.15,
              BABIP: 0.3,
              "wRC+": 100,
              WAR: 0,
              ADP: null,
            },
            {
              _type: "batter",
              _id: "batter-1",
              Name: "Mike Trout",
              Team: "LAA",
              PlayerId: "1",
              MLBAMID: "1",
              G: 0,
              PA: 0,
              AB: 0,
              H: 0,
              "1B": 0,
              "2B": 0,
              "3B": 0,
              HR: 0,
              R: 0,
              RBI: 0,
              BB: 0,
              IBB: 0,
              SO: 0,
              HBP: 0,
              SF: 0,
              SH: 0,
              GDP: 0,
              SB: 0,
              CS: 0,
              AVG: 0.25,
              OBP: 0.3,
              SLG: 0.4,
              OPS: 0.7,
              ISO: 0.15,
              BABIP: 0.3,
              "wRC+": 100,
              WAR: 0,
              ADP: null,
            },
          ],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: "MLBAMID",
          pitcherIdSource: "MLBAMID",
        },
      ],
      leagues: [
        {
          ...createLeague(),
          draftState: {
            format: "snake",
            draftedByTeam: {},
            keeperByTeam: { "keeper-1": "0" },
            keeperSlotByPlayer: { "keeper-1": 0 },
            pickIndex: 0,
            history: [],
          },
        },
      ],
    });

    render(<DraftSection />);

    expect(screen.getByText("M. Betts • R1")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Show keepers for Team 1" }));
    await user.type(screen.getByLabelText("Search keepers for Team 1"), "mike");
    await user.click(screen.getByRole("button", { name: /Mike Trout/i }));
    expect(setKeeperSpy).toHaveBeenCalledWith("batter-1", 0, 2);

    await user.click(screen.getByRole("button", { name: "Remove keeper Mookie Betts" }));
    expect(removeKeeperSpy).toHaveBeenCalledWith("keeper-1");
  });

  it("shows collapsed keeper badges with abbreviated first names and round labels", () => {
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      projectionGroups: [
        {
          id: "group-1",
          name: "Main Group",
          createdAt: "2026-02-11T00:00:00.000Z",
          source: { kind: "upload" },
          batters: [
            createBatter("keeper-1", "Mookie Betts", "LAD"),
            createBatter("keeper-2", "Fernando Tatis Jr.", "SD"),
          ],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: "MLBAMID",
          pitcherIdSource: "MLBAMID",
        },
      ],
      leagues: [
        createLeague({
          draftState: {
            format: "snake",
            draftedByTeam: {},
            keeperByTeam: { "keeper-1": "0", "keeper-2": "0" },
            keeperSlotByPlayer: { "keeper-1": 0, "keeper-2": 48 },
            pickIndex: 0,
            history: [],
          },
        }),
      ],
    });

    render(<DraftSection />);

    expect(screen.getByText("M. Betts • R1")).toBeVisible();
    expect(screen.getByText("F. Tatis Jr. • R5")).toBeVisible();
    expect(screen.queryByText(/next open:/i)).toBeNull();
    expect(screen.queryByText(/draft order locked/i)).toBeNull();
  });

  it("Given one team with keepers in rounds 5 and 6, when I click earlier or later, then only the selected keeper moves to the nearest open round", async () => {
    const user = userEvent.setup();
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      projectionGroups: [
        {
          id: "group-1",
          name: "Main Group",
          createdAt: "2026-02-11T00:00:00.000Z",
          source: { kind: "upload" },
          batters: [
            createBatter("keeper-1", "Mookie Betts", "LAD"),
            createBatter("keeper-2", "Mike Trout", "LAA"),
          ],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: "MLBAMID",
          pitcherIdSource: "MLBAMID",
        },
      ],
      leagues: [
        {
          ...createLeague(),
          draftState: {
            format: "snake",
            draftedByTeam: {},
            keeperByTeam: { "keeper-1": "0", "keeper-2": "0" },
            keeperSlotByPlayer: { "keeper-1": 48, "keeper-2": 60 },
            pickIndex: 0,
            history: [],
          },
        },
      ],
    });

    render(<DraftSection />);

    await user.click(screen.getByRole("button", { name: "Show keepers for Team 1" }));
    await user.click(screen.getByRole("button", { name: "Move keeper Mike Trout earlier" }));
    await user.click(screen.getByRole("button", { name: "Move keeper Mookie Betts later" }));

    expect(setKeeperSpy).toHaveBeenNthCalledWith(1, "keeper-2", 0, 4);
    expect(setKeeperSpy).toHaveBeenNthCalledWith(2, "keeper-1", 0, 7);
    expect(screen.getByLabelText("Keeper round for Mike Trout")).toBeVisible();
  });

  it("fades non-edited keepers into their new positions after a round edit reorders the list", async () => {
    const user = userEvent.setup();
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      projectionGroups: [
        {
          id: "group-1",
          name: "Main Group",
          createdAt: "2026-02-11T00:00:00.000Z",
          source: { kind: "upload" },
          batters: [
            createBatter("keeper-1", "Mookie Betts", "LAD"),
            createBatter("keeper-2", "Mike Trout", "LAA"),
          ],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: "MLBAMID",
          pitcherIdSource: "MLBAMID",
        },
      ],
      leagues: [
        createLeague({
          draftState: {
            format: "snake",
            draftedByTeam: {},
            keeperByTeam: { "keeper-1": "0", "keeper-2": "0" },
            keeperSlotByPlayer: { "keeper-1": 48, "keeper-2": 60 },
            pickIndex: 0,
            history: [],
          },
        }),
      ],
    });
    const { rerender } = render(<DraftSection />);

    await user.click(screen.getByRole("button", { name: "Show keepers for Team 1" }));
    await user.click(screen.getByRole("button", { name: "Move keeper Mike Trout earlier" }));

    useStoreMock.mockReturnValue({
      ...createStoreState(),
      projectionGroups: [
        {
          id: "group-1",
          name: "Main Group",
          createdAt: "2026-02-11T00:00:00.000Z",
          source: { kind: "upload" },
          batters: [
            createBatter("keeper-1", "Mookie Betts", "LAD"),
            createBatter("keeper-2", "Mike Trout", "LAA"),
          ],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: "MLBAMID",
          pitcherIdSource: "MLBAMID",
        },
      ],
      leagues: [
        createLeague({
          draftState: {
            format: "snake",
            draftedByTeam: {},
            keeperByTeam: { "keeper-1": "0", "keeper-2": "0" },
            keeperSlotByPlayer: { "keeper-1": 48, "keeper-2": 36 },
            pickIndex: 0,
            history: [],
          },
        }),
      ],
    });
    rerender(<DraftSection />);

    await waitFor(() => {
      expect(screen.getByText("Mookie Betts").closest("[data-keeper-row]")).toHaveClass(
        "keeper-row-fade-in"
      );
    });
  });

  it("Given one team with keepers in rounds 5 and 6, when I commit an occupied round, then the edit is rejected and the input reverts", async () => {
    const user = userEvent.setup();
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      projectionGroups: [
        {
          id: "group-1",
          name: "Main Group",
          createdAt: "2026-02-11T00:00:00.000Z",
          source: { kind: "upload" },
          batters: [
            createBatter("keeper-1", "Mookie Betts", "LAD"),
            createBatter("keeper-2", "Mike Trout", "LAA"),
          ],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: "MLBAMID",
          pitcherIdSource: "MLBAMID",
        },
      ],
      leagues: [
        {
          ...createLeague(),
          draftState: {
            format: "snake",
            draftedByTeam: {},
            keeperByTeam: { "keeper-1": "0", "keeper-2": "0" },
            keeperSlotByPlayer: { "keeper-1": 48, "keeper-2": 60 },
            pickIndex: 0,
            history: [],
          },
        },
      ],
    });

    render(<DraftSection />);

    await user.click(screen.getByRole("button", { name: "Show keepers for Team 1" }));
    const roundInput = screen.getByLabelText("Keeper round for Mookie Betts");
    await user.clear(roundInput);
    await user.type(roundInput, "6");
    await user.tab();

    expect(setKeeperSpy).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith("Round 6 is already occupied");
    expect(screen.getByLabelText("Keeper round for Mookie Betts")).toHaveValue("5");
  });

  it("selects the full keeper round value on focus so typing replaces it", async () => {
    const user = userEvent.setup();
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      projectionGroups: [
        {
          id: "group-1",
          name: "Main Group",
          createdAt: "2026-02-11T00:00:00.000Z",
          source: { kind: "upload" },
          batters: [createBatter("keeper-1", "Mookie Betts", "LAD")],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: "MLBAMID",
          pitcherIdSource: "MLBAMID",
        },
      ],
      leagues: [
        createLeague({
          draftState: {
            format: "snake",
            draftedByTeam: {},
            keeperByTeam: { "keeper-1": "0" },
            keeperSlotByPlayer: { "keeper-1": 48 },
            pickIndex: 0,
            history: [],
          },
        }),
      ],
    });

    render(<DraftSection />);

    await user.click(screen.getByRole("button", { name: "Show keepers for Team 1" }));
    const roundInput = screen.getByLabelText("Keeper round for Mookie Betts") as HTMLInputElement;

    await user.click(roundInput);

    expect(roundInput.selectionStart).toBe(0);
    expect(roundInput.selectionEnd).toBe(roundInput.value.length);

    await user.keyboard("7");

    expect(roundInput).toHaveValue("7");
  });

  it("Given the draft cursor has already passed a keeper slot, when I edit or move into that slot, then the change is rejected", async () => {
    const user = userEvent.setup();
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      projectionGroups: [
        {
          id: "group-1",
          name: "Main Group",
          createdAt: "2026-02-11T00:00:00.000Z",
          source: { kind: "upload" },
          batters: [
            createBatter("keeper-1", "Mookie Betts", "LAD"),
            createBatter("keeper-2", "Mike Trout", "LAA"),
          ],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: "MLBAMID",
          pitcherIdSource: "MLBAMID",
        },
      ],
      leagues: [
        {
          ...createLeague(),
          draftState: {
            format: "snake",
            draftedByTeam: {},
            keeperByTeam: { "keeper-1": "0", "keeper-2": "0" },
            keeperSlotByPlayer: { "keeper-1": 48, "keeper-2": 60 },
            pickIndex: 54,
            history: [],
          },
        },
      ],
    });

    render(<DraftSection />);

    await user.click(screen.getByRole("button", { name: "Show keepers for Team 1" }));
    const roundInput = screen.getByLabelText("Keeper round for Mike Trout");
    await user.clear(roundInput);
    await user.type(roundInput, "4");
    await user.tab();

    expect(setKeeperSpy).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith("That keeper slot has already passed");
    expect(screen.getByRole("button", { name: "Move keeper Mike Trout earlier" })).toBeDisabled();
  });

  it("Given a keeper is already at round 1 or the final roster round, when the Draft section renders, then the blocked arrow is disabled", async () => {
    const user = userEvent.setup();
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      projectionGroups: [
        {
          id: "group-1",
          name: "Main Group",
          createdAt: "2026-02-11T00:00:00.000Z",
          source: { kind: "upload" },
          batters: [
            createBatter("keeper-1", "Mookie Betts", "LAD"),
            createBatter("keeper-2", "Mike Trout", "LAA"),
          ],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: "MLBAMID",
          pitcherIdSource: "MLBAMID",
        },
      ],
      leagues: [
        {
          ...createLeague(),
          draftState: {
            format: "snake",
            draftedByTeam: {},
            keeperByTeam: { "keeper-1": "0", "keeper-2": "0" },
            keeperSlotByPlayer: { "keeper-1": 0, "keeper-2": 216 },
            pickIndex: 0,
            history: [],
          },
        },
      ],
    });

    render(<DraftSection />);

    await user.click(screen.getByRole("button", { name: "Show keepers for Team 1" }));
    expect(screen.getByRole("button", { name: "Move keeper Mookie Betts earlier" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move keeper Mike Trout later" })).toBeDisabled();
  });

  it("matches accented keeper names when the search omits accents", async () => {
    const user = userEvent.setup();
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      projectionGroups: [
        {
          id: "group-1",
          name: "Main Group",
          createdAt: "2026-02-11T00:00:00.000Z",
          source: { kind: "upload" },
          batters: [
            {
              _type: "batter",
              _id: "accented-1",
              Name: "José Berríos",
              Team: "TOR",
              PlayerId: "11",
              MLBAMID: "11",
              G: 0,
              PA: 0,
              AB: 0,
              H: 0,
              "1B": 0,
              "2B": 0,
              "3B": 0,
              HR: 0,
              R: 0,
              RBI: 0,
              BB: 0,
              IBB: 0,
              SO: 0,
              HBP: 0,
              SF: 0,
              SH: 0,
              GDP: 0,
              SB: 0,
              CS: 0,
              AVG: 0.25,
              OBP: 0.3,
              SLG: 0.4,
              OPS: 0.7,
              ISO: 0.15,
              BABIP: 0.3,
              "wRC+": 100,
              WAR: 0,
              ADP: null,
            },
          ],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: "MLBAMID",
          pitcherIdSource: "MLBAMID",
        },
      ],
    });

    render(<DraftSection />);

    await user.click(screen.getByRole("button", { name: "Show keepers for Team 1" }));
    await user.type(screen.getByLabelText("Search keepers for Team 1"), "jose berrios");
    expect(screen.getByRole("button", { name: /José Berríos/i })).toBeVisible();
  });

  it("sorts keeper search results by projected points", async () => {
    const user = userEvent.setup();
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      projectionGroups: [
        {
          id: "group-1",
          name: "Main Group",
          createdAt: "2026-02-11T00:00:00.000Z",
          source: { kind: "upload" },
          batters: [
            {
              _type: "batter",
              _id: "batter-low",
              Name: "Aaron Contact",
              Team: "SEA",
              PlayerId: "21",
              MLBAMID: "21",
              G: 0,
              PA: 0,
              AB: 0,
              H: 0,
              "1B": 5,
              "2B": 0,
              "3B": 0,
              HR: 0,
              R: 0,
              RBI: 0,
              BB: 0,
              IBB: 0,
              SO: 0,
              HBP: 0,
              SF: 0,
              SH: 0,
              GDP: 0,
              SB: 0,
              CS: 0,
              AVG: 0.25,
              OBP: 0.3,
              SLG: 0.4,
              OPS: 0.7,
              ISO: 0.15,
              BABIP: 0.3,
              "wRC+": 100,
              WAR: 0,
              ADP: null,
            },
            {
              _type: "batter",
              _id: "batter-high",
              Name: "Aaron Power",
              Team: "ATL",
              PlayerId: "22",
              MLBAMID: "22",
              G: 0,
              PA: 0,
              AB: 0,
              H: 0,
              "1B": 0,
              "2B": 0,
              "3B": 0,
              HR: 10,
              R: 0,
              RBI: 0,
              BB: 0,
              IBB: 0,
              SO: 0,
              HBP: 0,
              SF: 0,
              SH: 0,
              GDP: 0,
              SB: 0,
              CS: 0,
              AVG: 0.25,
              OBP: 0.3,
              SLG: 0.4,
              OPS: 0.7,
              ISO: 0.15,
              BABIP: 0.3,
              "wRC+": 100,
              WAR: 0,
              ADP: null,
            },
          ],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: "MLBAMID",
          pitcherIdSource: "MLBAMID",
        },
      ],
    });

    render(<DraftSection />);

    await user.click(screen.getByRole("button", { name: "Show keepers for Team 1" }));
    await user.type(screen.getByLabelText("Search keepers for Team 1"), "aaron");

    const resultButtons = screen.getAllByRole("button", { name: /Aaron/i });
    expect(resultButtons[0]).toHaveTextContent("Aaron Power");
    expect(resultButtons[1]).toHaveTextContent("Aaron Contact");
  });

  it("resets the draft from the draft settings view", async () => {
    const user = userEvent.setup();
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      leagues: [
        {
          ...createLeague(),
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
    });

    render(<DraftSection />);

    await user.click(screen.getByRole("button", { name: "Reset Draft" }));
    expect(screen.getByRole("dialog")).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: "Reset Draft" })[1]);
    expect(resetDraftSpy).toHaveBeenCalled();
  });

  it("hides reset draft when draft activity exists but no manual picks exist", () => {
    useStoreMock.mockReturnValue({
      ...createStoreState(),
      leagues: [
        {
          ...createLeague(),
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
    });

    render(<DraftSection />);

    expect(screen.queryByRole("button", { name: "Reset Draft" })).toBeNull();
  });

  it("hides reset draft when no draft activity exists", () => {
    render(<DraftSection />);

    expect(screen.queryByRole("button", { name: "Reset Draft" })).toBeNull();
  });
});
