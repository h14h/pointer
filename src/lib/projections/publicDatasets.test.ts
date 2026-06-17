import { describe, expect, it } from "bun:test";
import manifestFixture from "../../../data/public-datasets/manifest.json";
import {
  createProjectionGroupFromPublicDataset,
  parsePublicDatasetManifest,
  parsePublicDatasetPayload,
  type PublicDatasetPayload,
} from "@/lib/projections";

const minimalDatasetPayload: PublicDatasetPayload = {
  slug: "historical-2025",
  name: "2025 Prior-Year Baseline",
  season: 2025,
  sport: "baseball",
  datasetType: "historical-stats",
  projectionGroup: {
    id: "public-historical-2025",
    name: "2025 Prior-Year Stats",
    createdAt: "2026-03-22T00:00:00.000Z",
    batters: [
      {
        Name: "Test Batter",
        Team: "NYY",
        PlayerId: "1",
        MLBAMID: "100",
        G: 150,
        PA: 600,
        AB: 500,
        H: 150,
        "1B": 90,
        "2B": 30,
        "3B": 5,
        HR: 25,
        R: 80,
        RBI: 75,
        BB: 60,
        IBB: 5,
        SO: 120,
        HBP: 5,
        SF: 3,
        SH: 0,
        GDP: 10,
        SB: 10,
        CS: 3,
        AVG: 0.3,
        OBP: 0.38,
        SLG: 0.5,
        OPS: 0.88,
        ISO: 0.2,
        BABIP: 0.33,
        "wRC+": 130,
        WAR: 4.5,
        ADP: null,
        _type: "batter" as const,
        _id: "100",
      },
    ],
    pitchers: [
      {
        Name: "Test Pitcher",
        Team: "LAD",
        PlayerId: "2",
        MLBAMID: "200",
        W: 12,
        L: 5,
        QS: 18,
        CG: 1,
        ShO: 0,
        G: 30,
        GS: 30,
        SV: 0,
        HLD: 0,
        BS: 0,
        IP: 180,
        H: 140,
        R: 60,
        ER: 55,
        HR: 15,
        BB: 40,
        IBB: 2,
        HBP: 5,
        SO: 200,
        ERA: 2.75,
        WHIP: 1.0,
        "K/9": 10,
        "BB/9": 2,
        FIP: 3.0,
        WAR: 5.0,
        ADP: null,
        _type: "pitcher" as const,
        _id: "200",
      },
    ],
    twoWayPlayers: [],
    batterIdSource: "MLBAMID",
    pitcherIdSource: "MLBAMID",
  },
};

describe("public dataset manifest", () => {
  it("parses the checked-in public dataset catalog", () => {
    const manifest = parsePublicDatasetManifest(manifestFixture);

    expect(manifest.datasets).toHaveLength(2);
    expect(manifest.datasets.find((dataset) => dataset.sport === "baseball")).toMatchObject({
      slug: "historical-2025",
      default: true,
    });
    expect(manifest.datasets.find((dataset) => dataset.sport === "football")).toMatchObject({
      slug: "football-historical-2025",
      default: true,
    });
  });

  it("rejects manifests without any default dataset", () => {
    expect(() =>
      parsePublicDatasetManifest({
        datasets: [
          { slug: "a", name: "A", season: 2025, sport: "baseball", datasetType: "historical-stats", default: false },
        ],
      })
    ).toThrow("at least one default dataset");
  });

  it("allows one default dataset per sport", () => {
    const manifest = parsePublicDatasetManifest({
      datasets: [
        { slug: "baseball", name: "Baseball", season: 2025, sport: "baseball", datasetType: "historical-stats", default: true },
        { slug: "football", name: "Football", season: 2025, sport: "football", datasetType: "historical-stats", default: true },
      ],
    });

    expect(manifest.datasets.map((dataset) => dataset.sport).sort()).toEqual(["baseball", "football"]);
  });
});

describe("public dataset payload", () => {
  it("parses a valid dataset payload", () => {
    const payload = parsePublicDatasetPayload(minimalDatasetPayload);

    expect(payload.slug).toBe("historical-2025");
    expect(payload.sport).toBe("baseball");
    expect(payload.projectionGroup.name).toBe("2025 Prior-Year Stats");
    expect(payload.projectionGroup.batters.length).toBeGreaterThan(0);
    expect(payload.projectionGroup.pitchers.length).toBeGreaterThan(0);
  });

  it("builds a protected projection group from a public dataset payload", () => {
    const payload = parsePublicDatasetPayload(minimalDatasetPayload);
    const group = createProjectionGroupFromPublicDataset(payload, "2026-03-22T12:00:00.000Z");

    expect(group.source).toEqual({
      kind: "public-dataset",
      slug: "historical-2025",
      season: 2025,
      datasetType: "historical-stats",
      protected: true,
      seededAt: "2026-03-22T12:00:00.000Z",
    });
    expect(group.sport).toBe("baseball");
    expect(group.name).toBe(payload.projectionGroup.name);
  });

  it("builds a football projection group from a football public dataset payload", () => {
    const payload = parsePublicDatasetPayload({
      slug: "football-historical-2025",
      name: "2025 Football Prior-Year Baseline",
      season: 2025,
      sport: "football",
      datasetType: "historical-stats",
      projectionGroup: {
        id: "public-football-historical-2025",
        name: "2025 Football Prior-Year Stats",
        createdAt: "2026-03-22T00:00:00.000Z",
        batters: [],
        pitchers: [],
        twoWayPlayers: [],
        footballPlayers: [
          {
            _type: "football",
            _id: "qb-1",
            Name: "Test QB",
            Team: "BUF",
            PlayerId: "qb-1",
            Position: "QB",
            BYE: 7,
            PASS_ATT: 500,
            PASS_CMP: 330,
            PASS_YDS: 4100,
            PASS_TD: 32,
            PASS_INT: 10,
            RUSH_ATT: 90,
            RUSH_YDS: 450,
            RUSH_TD: 6,
            TGT: 0,
            REC: 0,
            REC_YDS: 0,
            REC_TD: 0,
            TWO_PT: 2,
            FUML: 3,
            FG: 0,
            FGA: 0,
            FG50: 0,
            XP: 0,
            SACK: 0,
            DST_INT: 0,
            FR: 0,
            FF: 0,
            DST_TD: 0,
            SAFETY: 0,
            BLK: 0,
            PTS_ALLOWED: 0,
            FPTS: null,
            ADP: null,
          },
        ],
        batterIdSource: null,
        pitcherIdSource: null,
      },
    });

    const group = createProjectionGroupFromPublicDataset(payload);

    expect(group.sport).toBe("football");
    expect(group.footballPlayers).toHaveLength(1);
    expect(group.batters).toEqual([]);
  });
});
