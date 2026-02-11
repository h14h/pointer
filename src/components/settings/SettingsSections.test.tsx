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

  beforeEach(() => {
    vi.clearAllMocks();
    useStoreMock.mockReturnValue({
      scoringSettings: createScoringSettings(),
      setScoringSettings: setScoringSettingsSpy,
      updateBattingScoring: updateBattingScoringSpy,
      updatePitchingScoring: updatePitchingScoringSpy,
      leagueSettings: createLeagueSettings(),
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
      mergeTwoWayRankings: true,
      setMergeTwoWayRankings: setMergeTwoWayRankingsSpy,
    });
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
    render(<RosterSection />);

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
  });

  it("applies draft controls for team management", async () => {
    const user = userEvent.setup();
    render(<DraftSection />);

    await user.click(screen.getAllByRole("button", { name: "Add Below" })[0]);
    const addTeamLeagueSettings = setLeagueSettingsSpy.mock.calls.at(-1)?.[0] as LeagueSettings;
    expect(addTeamLeagueSettings.teamNames.length).toBe(13);

    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    const removeTeamLeagueSettings = setLeagueSettingsSpy.mock.calls.at(-1)?.[0] as LeagueSettings;
    expect(removeTeamLeagueSettings.teamNames.length).toBe(11);

    const [teamNameInput] = screen.getAllByRole("textbox");
    await user.clear(teamNameInput);
    await user.keyboard("My Team");
    await user.tab();

    const renameLeagueSettings = setLeagueSettingsSpy.mock.calls.at(-1)?.[0] as LeagueSettings;
    expect(renameLeagueSettings.teamNames[0]).toBe("My Team");
  });
});
