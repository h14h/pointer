// @vitest-environment node

import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  generatePublicDataset,
  parseGenerateOptions,
} from "../../scripts/generate-public-dataset";

describe("generate public dataset script", () => {
  it("parses CLI options without hardcoded source paths", () => {
    const options = parseGenerateOptions([
      "--batters",
      "/tmp/batters.csv",
      "--pitchers",
      "/tmp/pitchers.csv",
      "--slug",
      "historical-2025",
      "--season",
      "2025",
      "--dataset-name",
      "2025 Prior-Year Baseline",
      "--group-name",
      "2025 Prior-Year Stats",
      "--out",
      "data/public-datasets/historical-2025.json",
      "--default",
    ]);

    expect(options).toMatchObject({
      battersPath: "/tmp/batters.csv",
      pitchersPath: "/tmp/pitchers.csv",
      slug: "historical-2025",
      season: 2025,
      datasetName: "2025 Prior-Year Baseline",
      projectionGroupName: "2025 Prior-Year Stats",
      outputPath: "data/public-datasets/historical-2025.json",
      setDefault: true,
    });
  });

  it("generates a normalized dataset payload from batter and pitcher CSV files", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "pointer-public-dataset-"));
    const batterPath = path.join(tempDir, "batters.csv");
    const pitcherPath = path.join(tempDir, "pitchers.csv");

    await writeFile(
      batterPath,
      [
        "Name,Team,PlayerId,MLBAMID,G,PA,AB,H,1B,2B,3B,HR,R,RBI,BB,IBB,SO,HBP,SF,SH,GDP,SB,CS,AVG,OBP,SLG,OPS,ISO,BABIP,wRC+,WAR,ADP",
        "Shohei Ohtani,LAD,1,660271,150,600,500,150,80,20,5,45,120,110,80,5,150,3,4,0,8,30,4,0.300,0.390,0.600,0.990,0.300,0.320,170,8.0,1"
      ].join("\n"),
      "utf8"
    );

    await writeFile(
      pitcherPath,
      [
        "Name,Team,PlayerId,MLBAMID,W,L,QS,CG,ShO,G,GS,SV,HLD,BS,IP,H,R,ER,HR,BB,IBB,HBP,SO,ERA,WHIP,K/9,BB/9,FIP,WAR,ADP",
        "Shohei Ohtani,LAD,1,660271,10,5,18,1,0,25,25,0,0,0,160,110,55,50,15,40,0,2,190,2.81,0.94,10.69,2.25,3.10,5.0,2"
      ].join("\n"),
      "utf8"
    );

    const payload = await generatePublicDataset({
      battersPath: batterPath,
      pitchersPath: pitcherPath,
      slug: "historical-2025",
      datasetName: "2025 Prior-Year Baseline",
      projectionGroupName: "2025 Prior-Year Stats",
      season: 2025,
      outputPath: path.join(tempDir, "historical-2025.json"),
      setDefault: true,
    });

    expect(payload.slug).toBe("historical-2025");
    expect(payload.projectionGroup.batters).toHaveLength(1);
    expect(payload.projectionGroup.pitchers).toHaveLength(1);
    expect(payload.projectionGroup.twoWayPlayers).toHaveLength(1);
    expect(payload.projectionGroup.batterIdSource).toBe("MLBAMID");
    expect(payload.projectionGroup.pitcherIdSource).toBe("MLBAMID");
  });
});
