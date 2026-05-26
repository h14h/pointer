import { describe, it, expect } from "bun:test";
import { isFootballCsv, parseFootballCsv } from "./footballParser";

describe("football CSV parser", () => {
  describe("isFootballCsv", () => {
    it("detects football CSV by PassYds column", () => {
      expect(isFootballCsv(["Name", "Team", "PassYds", "PassTD"])).toBe(true);
    });

    it("detects football CSV by RushTD column", () => {
      expect(isFootballCsv(["Name", "Team", "RushYds", "RushTD"])).toBe(true);
    });

    it("returns false for baseball batter CSV", () => {
      expect(isFootballCsv(["Name", "PA", "AB", "HR", "RBI"])).toBe(false);
    });

    it("returns false for baseball pitcher CSV", () => {
      expect(isFootballCsv(["Name", "ERA", "WHIP", "IP", "GS"])).toBe(false);
    });
  });

  describe("parseFootballCsv", () => {
    it("parses a standard football CSV", () => {
      const csv = `Name,Team,Position,PassYds,PassTD,Int,RushYds,RushTD,Rec,RecYds,RecTD,ADP
Patrick Mahomes,KC,QB,4500,35,10,300,2,0,0,0,5
Derrick Henry,TEN,RB,0,0,0,1200,12,20,150,1,15`;

      const players = parseFootballCsv(csv);
      expect(players.length).toBe(2);

      const mahomes = players[0];
      expect(mahomes.Name).toBe("Patrick Mahomes");
      expect(mahomes.Team).toBe("KC");
      expect(mahomes.Position).toBe("QB");
      expect(mahomes.PassYds).toBe(4500);
      expect(mahomes.PassTD).toBe(35);
      expect(mahomes.Int).toBe(10);
      expect(mahomes.RushYds).toBe(300);
      expect(mahomes.ADP).toBe(5);

      const henry = players[1];
      expect(henry.Name).toBe("Derrick Henry");
      expect(henry.Position).toBe("RB");
      expect(henry.RushYds).toBe(1200);
      expect(henry.Rec).toBe(20);
    });

    it("defaults missing columns to 0", () => {
      const csv = `Name,Team,Position,PassYds,PassTD,Int,RushYds,RushTD,Rec,RecYds,RecTD
Tom Brady,TB,QB,4000,30,8,0,0,0,0,0`;

      const players = parseFootballCsv(csv);
      expect(players.length).toBe(1);
      expect(players[0].PassYds).toBe(4000);
      expect(players[0]["2PT"]).toBe(0);
      expect(players[0].FumLost).toBe(0);
      expect(players[0].ADP).toBeNull();
    });

    it("filters out invalid positions", () => {
      const csv = `Name,Team,Position,PassYds,PassTD,Int,RushYds,RushTD,Rec,RecYds,RecTD
Foo Bar,ZZ,K,0,0,0,0,0,0,0,0`;

      const players = parseFootballCsv(csv);
      expect(players.length).toBe(0);
    });

    it("handles TSV delimiters", () => {
      const tsv = `Name\tTeam\tPosition\tPassYds\tPassTD\tInt\tRushYds\tRushTD\tRec\tRecYds\tRecTD\tADP
Justin Herbert\tLAC\tQB\t4200\t28\t12\t200\t1\t0\t0\t0\t20`;

      const players = parseFootballCsv(tsv);
      expect(players.length).toBe(1);
      expect(players[0].Name).toBe("Justin Herbert");
      expect(players[0].Position).toBe("QB");
    });

    it("returns empty array for non-football CSV", () => {
      const csv = `Name,PA,AB,HR,RBI
Mike Trout,LAA,600,40,100`;
      expect(parseFootballCsv(csv)).toEqual([]);
    });
  });
});
