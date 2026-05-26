export type FootballPosition = "QB" | "RB" | "WR" | "TE";

export type FootballRosterSlot = FootballPosition | "Flex" | "K" | "DST" | "Bench";

export interface FootballScoringSettings {
  name: string;
  passing: {
    PassYds: number; // per yard
    PassTD: number;
    Int: number;
  };
  rushing: {
    RushYds: number;
    RushTD: number;
  };
  receiving: {
    Rec: number; // PPR
    RecYds: number;
    RecTD: number;
  };
  misc: {
    "2PT": number;
    FumLost: number;
  };
}

export interface FootballPlayer {
  _type: "football-player";
  _id: string;
  Name: string;
  Team: string;
  Position: FootballPosition;
  // Passing
  PassYds: number;
  PassTD: number;
  Int: number;
  // Rushing
  RushYds: number;
  RushTD: number;
  // Receiving
  Rec: number;
  RecYds: number;
  RecTD: number;
  // Misc
  "2PT": number;
  FumLost: number;
  // Rate / display
  ADP: number | null;
}
