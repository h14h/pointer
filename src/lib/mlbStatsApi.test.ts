import { describe, expect, it } from "bun:test";
import { _internal } from "./mlbStatsApi";

describe("mlbStatsApi parsing", () => {
  it("parses fielding stats into position games", () => {
    const data = {
      stats: [
        {
          splits: [
            {
              player: { id: 1 },
              position: { abbreviation: "SS" },
              stat: { games: 10 },
            },
            {
              player: { id: 1 },
              position: { abbreviation: "3B" },
              stat: { games: 5 },
            },
          ],
        },
      ],
    };

    const map = _internal.parseFieldingStats(data);
    const games = map.get("1");
    expect(games?.SS).toBe(10);
    expect(games?.["3B"]).toBe(5);
  });

  it("parses pitching stats into G/GS", () => {
    const data = {
      stats: [
        {
          splits: [
            {
              player: { id: 99 },
              stat: { games: 12, gamesStarted: 4 },
            },
          ],
        },
      ],
    };

    const map = _internal.parsePitchingStats(data);
    expect(map.get("99")).toEqual({ G: 12, GS: 4 });
  });

  it("uses gamesPlayed when games is missing", () => {
    const data = {
      stats: [
        {
          splits: [
            {
              player: { id: 11 },
              stat: { gamesPlayed: 18, gamesStarted: 2 },
            },
          ],
        },
      ],
    };

    const map = _internal.parsePitchingStats(data);
    expect(map.get("11")).toEqual({ G: 18, GS: 2 });
  });

  it("parses people stats for fielding and pitching", () => {
    const data = {
      people: [
        {
          id: 123,
          stats: [
            {
              group: { displayName: "fielding" },
              splits: [
                { position: { abbreviation: "SS" }, stat: { games: 12 } },
                { position: { abbreviation: "DH" }, stat: { games: 5 } },
              ],
            },
            {
              group: { displayName: "pitching" },
              splits: [{ stat: { gamesPlayed: 10, gamesStarted: 3 } }],
            },
          ],
        },
      ],
    };

    const parsed = _internal.parsePeopleStats(data);
    expect(parsed.fieldingById.get("123")?.SS).toBe(12);
    expect(parsed.fieldingById.get("123")?.DH).toBe(5);
    expect(parsed.pitchingById.get("123")).toEqual({ G: 10, GS: 3 });
    expect(parsed.primaryPositionById.get("123")).toBeUndefined();
  });

  it("captures primaryPosition from people response", () => {
    const data = {
      people: [
        {
          id: 77,
          primaryPosition: { abbreviation: "CF" },
          stats: [],
        },
      ],
    };

    const parsed = _internal.parsePeopleStats(data);
    expect(parsed.primaryPositionById.get("77")).toBe("CF");
  });
});
