import type { FootballScoringSettings, LeagueSettings, RosterSettings, RosterSlot } from "@/types";

export const defaultFootballScoringSettings: FootballScoringSettings = {
  name: "Half-PPR",
  passing: { PassYds: 0.04, PassTD: 4, Int: -2 },
  rushing: { RushYds: 0.1, RushTD: 6 },
  receiving: { Rec: 0.5, RecYds: 0.1, RecTD: 6 },
  misc: { "2PT": 2, FumLost: -2 },
};

export const defaultFootballRosterSettings: RosterSettings = {
  positions: {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    Flex: 1,
    K: 1,
    DST: 1,
    Bench: 6,
    // Zero out baseball slots
    C: 0,
    "1B": 0,
    "2B": 0,
    "3B": 0,
    SS: 0,
    LF: 0,
    CF: 0,
    RF: 0,
    DH: 0,
    CI: 0,
    MI: 0,
    IF: 0,
    OF: 0,
    UTIL: 0,
    SP: 0,
    RP: 0,
    P: 0,
    IL: 0,
    NA: 0,
  } as Record<RosterSlot, number>,
  bench: 0, // bench is embedded as "Bench" slot for football
};

export const defaultFootballLeagueSettings: LeagueSettings = {
  sport: "football",
  leagueSize: 10,
  teamNames: Array.from({ length: 10 }, (_, i) => `Team ${i + 1}`),
  roster: defaultFootballRosterSettings,
  weeklyStartLimit: null,
};
