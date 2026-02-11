import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScoringForm } from "@/components/ScoringForm";
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

describe("ScoringForm keyboard numeric navigation", () => {
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

  it("supports number-tab-number flow across numeric inputs with one tab between fields", async () => {
    const user = userEvent.setup();
    const { container } = render(<ScoringForm isOpen onClose={() => {}} />);

    const numericInputs = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[data-numeric-input="true"]')
    );
    expect(numericInputs.length).toBeGreaterThan(20);

    const stepperButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[data-numeric-stepper="true"]')
    );
    expect(stepperButtons.length).toBeGreaterThan(0);
    stepperButtons.forEach((button) => {
      expect(button).toHaveAttribute("tabindex", "-1");
    });

    await user.click(numericInputs[0]);
    await user.keyboard("9");

    for (let index = 1; index <= 6; index += 1) {
      await user.tab();
      expect(document.activeElement).toBe(numericInputs[index]);
      expect(numericInputs[index]).toHaveAttribute("data-numeric-input", "true");
      await user.keyboard(String(index));
      expect(container.querySelector('button[data-numeric-stepper="true"]:focus')).toBeNull();
    }
  });

  it("commits scoring and roster updates and preserves overwrite typing behavior", async () => {
    const user = userEvent.setup();
    render(<ScoringForm isOpen onClose={() => {}} />);

    const hitsInput = screen.getByLabelText("Hits (H) - all types points");
    await user.click(hitsInput);
    await user.clear(hitsInput);
    await user.keyboard("7");
    await user.tab();
    expect(updateBattingScoringSpy).toHaveBeenCalledWith("H", 7);

    const lfInput = screen.getByLabelText("Roster LF");
    await user.click(lfInput);
    await user.clear(lfInput);
    await user.keyboard("4");
    await user.tab();
    const lfLeagueSettings = setLeagueSettingsSpy.mock.calls.at(-1)?.[0] as LeagueSettings;
    expect(lfLeagueSettings.roster.positions.LF).toBe(4);

    const benchInput = screen.getByLabelText("Bench") as HTMLInputElement;
    expect(benchInput.value).toBe("3");
    await user.click(benchInput);
    await user.clear(benchInput);
    await user.keyboard("9");
    await user.tab();
    const benchLeagueSettings = setLeagueSettingsSpy.mock.calls.at(-1)?.[0] as LeagueSettings;
    expect(benchLeagueSettings.roster.bench).toBe(9);
  });
});
