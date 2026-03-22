import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DraftSection } from "@/components/settings/DraftSection";
import { RosterSection } from "@/components/settings/RosterSection";
import { ScoringSection } from "@/components/settings/ScoringSection";
import type { LeagueSettings, ScoringSettings } from "@/types";

const useStoreMock = vi.fn();

vi.mock("@/store", () => ({
  useStore: () => useStoreMock(),
}));

vi.mock("@/lib/useDebounce", () => ({
  useDebouncedCallback: <T extends (...args: never[]) => void>(callback: T) => callback,
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

describe("settings sections", () => {
  const setScoringSettingsSpy = vi.fn();
  const updateBattingScoringSpy = vi.fn();
  const updatePitchingScoringSpy = vi.fn();
  const setLeagueSettingsSpy = vi.fn();
  const setMergeTwoWayRankingsSpy = vi.fn();
  const setKeeperForTeamSpy = vi.fn();
  const removeKeeperSpy = vi.fn();
  const resetDraftSpy = vi.fn();
  const canEditDraftSetupSpy = vi.fn(() => true);

  const createLeague = () => ({
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
  });

  const createStoreState = () => ({
    leagues: [createLeague()],
    activeLeagueId: "league-1",
    setScoringSettings: setScoringSettingsSpy,
    updateBattingScoring: updateBattingScoringSpy,
    updatePitchingScoring: updatePitchingScoringSpy,
    setLeagueSettings: setLeagueSettingsSpy,
    projectionGroups: [
      {
        id: "group-1",
        name: "Main Group",
        createdAt: "2026-02-11T00:00:00.000Z",
        batters: [],
        pitchers: [],
        twoWayPlayers: [],
        batterIdSource: "MLBAMID",
        pitcherIdSource: "MLBAMID",
      },
    ],
    activeProjectionGroupId: "group-1",
    setKeeperForTeam: setKeeperForTeamSpy,
    removeKeeper: removeKeeperSpy,
    resetDraft: resetDraftSpy,
    canEditDraftSetup: canEditDraftSetupSpy,
    mergeTwoWayRankings: true,
    setMergeTwoWayRankings: setMergeTwoWayRankingsSpy,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    canEditDraftSetupSpy.mockReturnValue(true);
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

    expect(updateBattingScoringSpy).toHaveBeenCalledWith("H", 7);
  });

  it("commits roster slot and bench updates", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RosterSection />);

    const lfInput = screen.getByLabelText("Roster LF");
    await user.click(lfInput);
    await user.clear(lfInput);
    await user.keyboard("4");
    await user.tab();

    const lfLeagueSettings = setLeagueSettingsSpy.mock.calls.at(-1)?.[0] as LeagueSettings;
    expect(lfLeagueSettings.roster.positions.LF).toBe(4);

    const benchInput = screen.getByLabelText("Bench");
    await user.click(benchInput);
    await user.clear(benchInput);
    await user.keyboard("9");
    await user.tab();

    const benchLeagueSettings = setLeagueSettingsSpy.mock.calls.at(-1)?.[0] as LeagueSettings;
    expect(benchLeagueSettings.roster.bench).toBe(9);

    const weeklyStartLimitInput = screen.getByLabelText("Weekly Start Limit");
    expect(weeklyStartLimitInput).toBeDisabled();

    const weeklyStartLimitToggle = screen.getByRole("switch", {
      name: "Enable weekly start limit",
    });
    await user.click(weeklyStartLimitToggle);

    const enabledWeeklyStartLimitLeagueSettings = setLeagueSettingsSpy.mock.calls.at(-1)?.[0] as LeagueSettings;
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

    const weeklyStartLimitLeagueSettings = setLeagueSettingsSpy.mock.calls.at(-1)?.[0] as LeagueSettings;
    expect(weeklyStartLimitLeagueSettings.weeklyStartLimit).toBe(14);
  });

  it("applies draft controls for team management", async () => {
    const user = userEvent.setup();
    render(<DraftSection />);

    await user.click(screen.getAllByRole("button", { name: /Add team below/i })[0]);
    const addTeamLeagueSettings = setLeagueSettingsSpy.mock.calls.at(-1)?.[0] as LeagueSettings;
    expect(addTeamLeagueSettings.teamNames.length).toBe(13);

    await user.click(screen.getAllByRole("button", { name: /Remove/i })[0]);
    const removeTeamLeagueSettings = setLeagueSettingsSpy.mock.calls.at(-1)?.[0] as LeagueSettings;
    expect(removeTeamLeagueSettings.teamNames.length).toBe(11);

    const teamNameInput = screen.getByLabelText("Team 1 name");
    await user.clear(teamNameInput);
    await user.keyboard("My Team");
    await user.tab();

    const renameLeagueSettings = setLeagueSettingsSpy.mock.calls.at(-1)?.[0] as LeagueSettings;
    expect(renameLeagueSettings.teamNames[0]).toBe("My Team");
  });

  it("locks risky draft setup edits once picks or keepers exist", async () => {
    const user = userEvent.setup();
    canEditDraftSetupSpy.mockReturnValue(false);
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
      canEditDraftSetup: canEditDraftSetupSpy,
    });

    render(<DraftSection />);

    expect(screen.getByText(/team order, add\/remove, and league size are locked/i)).toBeVisible();
    expect(screen.getByLabelText("League size")).toBeDisabled();

    await user.click(screen.getAllByRole("button", { name: /Add team below/i })[0]);
    expect(setLeagueSettingsSpy).not.toHaveBeenCalled();
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

    await user.type(screen.getByLabelText("Search keepers for Team 1"), "mike");
    await user.click(screen.getByRole("button", { name: /Mike Trout/i }));
    expect(setKeeperForTeamSpy).toHaveBeenCalledWith("batter-1", 0, 2);
    expect(screen.getAllByText("Pick 24").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Remove keeper Mookie Betts" }));
    expect(removeKeeperSpy).toHaveBeenCalledWith("keeper-1");
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

  it("disables reset draft when no manual picks exist", () => {
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

    expect(screen.getByRole("button", { name: "Reset Draft" })).toBeDisabled();
  });
});
