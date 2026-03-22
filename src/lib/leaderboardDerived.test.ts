import { describe, expect, it, vi } from "vitest";
import * as calculatePARModule from "@/lib/calculatePAR";
import {
	buildBaseRankedPlayers,
	buildFilterMetadata,
	filterRankedPlayers,
	sortLeaderboardRows,
} from "@/lib/leaderboardDerived";
import type {
	BatterPlayer,
	DraftState,
	LeagueSettings,
	PitcherPlayer,
	ProjectionGroup,
	ScoringSettings,
	TwoWayPlayer,
} from "@/types";

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
		leagueSize: 2,
		teamNames: ["Team 1", "Team 2"],
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
				OF: 1,
				UTIL: 1,
				SP: 0,
				RP: 0,
				P: 2,
				IL: 0,
				NA: 0,
			},
			bench: 2,
		},
	};
}

function createDraftState(): DraftState {
	return {
		format: "snake",
		draftedByTeam: {},
		keeperByTeam: {},
		keeperSlotByPlayer: {},
		pickIndex: 0,
		history: [],
	};
}

function createBatter(overrides: Partial<BatterPlayer>): BatterPlayer {
	return {
		_type: "batter",
		_id: overrides._id ?? crypto.randomUUID(),
		Name: overrides.Name ?? "Batter",
		Team: overrides.Team ?? "LAA",
		PlayerId: overrides.PlayerId ?? "1",
		MLBAMID: overrides.MLBAMID ?? "1",
		G: overrides.G ?? 0,
		PA: overrides.PA ?? 0,
		AB: overrides.AB ?? 0,
		H: overrides.H ?? 0,
		"1B": overrides["1B"] ?? 0,
		"2B": overrides["2B"] ?? 0,
		"3B": overrides["3B"] ?? 0,
		HR: overrides.HR ?? 0,
		R: overrides.R ?? 0,
		RBI: overrides.RBI ?? 0,
		BB: overrides.BB ?? 0,
		IBB: overrides.IBB ?? 0,
		SO: overrides.SO ?? 0,
		HBP: overrides.HBP ?? 0,
		SF: overrides.SF ?? 0,
		SH: overrides.SH ?? 0,
		GDP: overrides.GDP ?? 0,
		SB: overrides.SB ?? 0,
		CS: overrides.CS ?? 0,
		AVG: overrides.AVG ?? 0.25,
		OBP: overrides.OBP ?? 0.3,
		SLG: overrides.SLG ?? 0.4,
		OPS: overrides.OPS ?? 0.7,
		ISO: overrides.ISO ?? 0.15,
		BABIP: overrides.BABIP ?? 0.3,
		"wRC+": overrides["wRC+"] ?? 100,
		WAR: overrides.WAR ?? 0,
		ADP: overrides.ADP ?? null,
		eligibility: overrides.eligibility,
	};
}

function createPitcher(overrides: Partial<PitcherPlayer>): PitcherPlayer {
	return {
		_type: "pitcher",
		_id: overrides._id ?? crypto.randomUUID(),
		Name: overrides.Name ?? "Pitcher",
		Team: overrides.Team ?? "NYY",
		PlayerId: overrides.PlayerId ?? "2",
		MLBAMID: overrides.MLBAMID ?? "2",
		W: overrides.W ?? 0,
		L: overrides.L ?? 0,
		QS: overrides.QS ?? 0,
		CG: overrides.CG ?? 0,
		ShO: overrides.ShO ?? 0,
		G: overrides.G ?? 0,
		GS: overrides.GS ?? 0,
		SV: overrides.SV ?? 0,
		HLD: overrides.HLD ?? 0,
		BS: overrides.BS ?? 0,
		IP: overrides.IP ?? 0,
		H: overrides.H ?? 0,
		R: overrides.R ?? 0,
		ER: overrides.ER ?? 0,
		HR: overrides.HR ?? 0,
		BB: overrides.BB ?? 0,
		IBB: overrides.IBB ?? 0,
		HBP: overrides.HBP ?? 0,
		SO: overrides.SO ?? 0,
		ERA: overrides.ERA ?? 3,
		WHIP: overrides.WHIP ?? 1.1,
		"K/9": overrides["K/9"] ?? 9,
		"BB/9": overrides["BB/9"] ?? 2.5,
		FIP: overrides.FIP ?? 3.2,
		WAR: overrides.WAR ?? 0,
		ADP: overrides.ADP ?? null,
		eligibility: overrides.eligibility,
	};
}

function createTwoWay(overrides: Partial<TwoWayPlayer>): TwoWayPlayer {
	return {
		_type: "two-way",
		_id: overrides._id ?? crypto.randomUUID(),
		Name: overrides.Name ?? "Two Way",
		Team: overrides.Team ?? "LAD",
		PlayerId: overrides.PlayerId ?? "3",
		MLBAMID: overrides.MLBAMID ?? "3",
		ADP: overrides.ADP ?? null,
		_battingStats: overrides._battingStats ?? {
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
		},
		_pitchingStats: overrides._pitchingStats ?? {
			W: 0,
			L: 0,
			QS: 0,
			CG: 0,
			ShO: 0,
			G: 0,
			GS: 0,
			SV: 0,
			HLD: 0,
			BS: 0,
			IP: 0,
			H: 0,
			R: 0,
			ER: 0,
			HR: 0,
			BB: 0,
			IBB: 0,
			HBP: 0,
			SO: 0,
			ERA: 3,
			WHIP: 1.1,
			"K/9": 9,
			"BB/9": 2.5,
			FIP: 3.2,
			WAR: 0,
		},
		eligibility: overrides.eligibility,
	};
}

function createProjectionGroup(): ProjectionGroup {
	return {
		id: "group-1",
		name: "Main",
		createdAt: "2026-03-22T00:00:00.000Z",
		batterIdSource: "MLBAMID",
		pitcherIdSource: "MLBAMID",
		batters: [
			createBatter({
				_id: "batter-1",
				Name: "Mike Trout",
				Team: "LAA",
				HR: 35,
				R: 90,
				RBI: 85,
				BB: 70,
				SB: 10,
				"1B": 70,
				eligibility: {
					positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 110, RF: 0, DH: 0 },
					eligiblePositions: ["CF"],
					isSP: false,
					isRP: false,
					sourceSeason: 2025,
					updatedAt: "2026-03-22T00:00:00.000Z",
				},
			}),
			createBatter({
				_id: "batter-2",
				Name: "Corey Seager",
				Team: "TEX",
				HR: 30,
				R: 80,
				RBI: 88,
				"1B": 60,
				BB: 55,
				eligibility: {
					positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 120, LF: 0, CF: 0, RF: 0, DH: 0 },
					eligiblePositions: ["SS"],
					isSP: false,
					isRP: false,
					sourceSeason: 2025,
					updatedAt: "2026-03-22T00:00:00.000Z",
				},
			}),
		],
		pitchers: [
			createPitcher({
				_id: "pitcher-1",
				Name: "Gerrit Cole",
				Team: "NYY",
				W: 14,
				QS: 18,
				SO: 210,
				IP: 180,
				ER: 60,
				H: 140,
				BB: 40,
				eligibility: {
					positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 0, RF: 0, DH: 0 },
					eligiblePositions: [],
					isSP: true,
					isRP: false,
					sourceSeason: 2025,
					updatedAt: "2026-03-22T00:00:00.000Z",
				},
			}),
		],
		twoWayPlayers: [
			createTwoWay({
				_id: "two-way-1",
				Name: "Shohei Ohtani",
				Team: "LAD",
				_battingStats: {
					G: 0,
					PA: 550,
					AB: 500,
					H: 120,
					"1B": 60,
					"2B": 20,
					"3B": 5,
					HR: 25,
					R: 95,
					RBI: 75,
					BB: 80,
					IBB: 0,
					SO: 120,
					HBP: 5,
					SF: 0,
					SH: 0,
					GDP: 0,
					SB: 20,
					CS: 5,
					AVG: 0.29,
					OBP: 0.38,
					SLG: 0.55,
					OPS: 0.93,
					ISO: 0.26,
					BABIP: 0.31,
					"wRC+": 150,
					WAR: 0,
				},
				_pitchingStats: {
					W: 10,
					L: 4,
					QS: 12,
					CG: 0,
					ShO: 0,
					G: 0,
					GS: 20,
					SV: 0,
					HLD: 0,
					BS: 0,
					IP: 120,
					H: 90,
					R: 0,
					ER: 42,
					HR: 12,
					BB: 35,
					IBB: 0,
					HBP: 4,
					SO: 150,
					ERA: 3.15,
					WHIP: 1.04,
					"K/9": 11.2,
					"BB/9": 2.6,
					FIP: 3.1,
					WAR: 0,
				},
				eligibility: {
					positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 0, RF: 0, DH: 120 },
					eligiblePositions: ["DH"],
					isSP: true,
					isRP: false,
					sourceSeason: 2025,
					updatedAt: "2026-03-22T00:00:00.000Z",
				},
			}),
		],
	};
}

describe("leaderboardDerived", () => {
	it("builds stable ranked output for the same inputs", () => {
		const args = {
			activeGroup: createProjectionGroup(),
			playerView: "all" as const,
			scoringSettings: createScoringSettings(),
			leagueSettings: createLeagueSettings(),
			draftState: createDraftState(),
			mergeTwoWayRankings: true,
		};

		const first = buildBaseRankedPlayers(args);
		const second = buildBaseRankedPlayers(args);

		expect(first).toEqual(second);
		expect(first.map((row) => row.player._id)).toContain("two-way-1");
	});

	it("filters by position and search without recomputing PAR", () => {
		const parSpy = vi.spyOn(calculatePARModule, "calculatePAR");
		const rows = buildFilterMetadata([
			{
				player: createBatter({
					_id: "search-1",
					Name: "Mookie Betts",
					Team: "LAD",
					eligibility: {
						positionGames: { C: 0, "1B": 0, "2B": 30, "3B": 0, SS: 0, LF: 0, CF: 0, RF: 70, DH: 0 },
						eligiblePositions: ["2B", "RF"],
						isSP: false,
						isRP: false,
						sourceSeason: 2025,
						updatedAt: "2026-03-22T00:00:00.000Z",
					},
				}),
				projectedPoints: 100,
				par: 20,
				isDrafted: false,
				isKeeper: false,
			},
		]);

		const filtered = filterRankedPlayers({
			rows,
			selectedPositions: new Set(["2B"]),
			isDraftMode: false,
			draftFilter: "all",
			search: "lad",
		});

		expect(filtered).toHaveLength(1);
		expect(filtered[0]?.player.Name).toBe("Mookie Betts");
		expect(parSpy).not.toHaveBeenCalled();
	});

	it("uses player-view scoring for two-way players", () => {
		const group = createProjectionGroup();
		const scoringSettings = createScoringSettings();
		const leagueSettings = createLeagueSettings();
		const draftState = createDraftState();

		const allRow = buildBaseRankedPlayers({
			activeGroup: group,
			playerView: "all",
			scoringSettings,
			leagueSettings,
			draftState,
			mergeTwoWayRankings: true,
		}).find((row) => row.player._id === "two-way-1");
		const batterRow = buildBaseRankedPlayers({
			activeGroup: group,
			playerView: "batters",
			scoringSettings,
			leagueSettings,
			draftState,
			mergeTwoWayRankings: true,
		}).find((row) => row.player._id === "two-way-1");
		const pitcherRow = buildBaseRankedPlayers({
			activeGroup: group,
			playerView: "pitchers",
			scoringSettings,
			leagueSettings,
			draftState,
			mergeTwoWayRankings: true,
		}).find((row) => row.player._id === "two-way-1");

		expect(allRow).toBeDefined();
		expect(batterRow).toBeDefined();
		expect(pitcherRow).toBeDefined();
		expect(allRow!.projectedPoints).toBeGreaterThan(batterRow!.projectedPoints);
		expect(allRow!.projectedPoints).toBeGreaterThan(pitcherRow!.projectedPoints);
	});

	it("filters out fringe hitters and pitchers below minimum projection thresholds", () => {
		const group = createProjectionGroup();
		group.batters.push(
			createBatter({
				_id: "batter-fringe",
				Name: "Fringe Batter",
				PA: 9,
				eligibility: {
					positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 10, RF: 0, DH: 0 },
					eligiblePositions: ["CF"],
					isSP: false,
					isRP: false,
					sourceSeason: 2025,
					updatedAt: "2026-03-22T00:00:00.000Z",
				},
			})
		);
		group.pitchers.push(
			createPitcher({
				_id: "pitcher-fringe",
				Name: "Fringe Pitcher",
				IP: 4.2,
				eligibility: {
					positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 0, RF: 0, DH: 0 },
					eligiblePositions: [],
					isSP: false,
					isRP: true,
					sourceSeason: 2025,
					updatedAt: "2026-03-22T00:00:00.000Z",
				},
			})
		);

		const rows = buildBaseRankedPlayers({
			activeGroup: group,
			playerView: "all",
			scoringSettings: createScoringSettings(),
			leagueSettings: createLeagueSettings(),
			draftState: createDraftState(),
			mergeTwoWayRankings: true,
		});

		expect(rows.map((row) => row.player._id)).not.toContain("batter-fringe");
		expect(rows.map((row) => row.player._id)).not.toContain("pitcher-fringe");
	});

	it("keeps two-way players in all view when either batting or pitching clears the minimum", () => {
		const group = createProjectionGroup();
		group.twoWayPlayers.push(
			createTwoWay({
				_id: "two-way-bat-only",
				Name: "Bat Side Only",
				_battingStats: {
					...createTwoWay({})._battingStats,
					PA: 15,
					H: 5,
					"1B": 5,
				},
				_pitchingStats: {
					...createTwoWay({})._pitchingStats,
					IP: 2,
				},
				eligibility: {
					positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 0, RF: 0, DH: 20 },
					eligiblePositions: ["DH"],
					isSP: true,
					isRP: false,
					sourceSeason: 2025,
					updatedAt: "2026-03-22T00:00:00.000Z",
				},
			}),
			createTwoWay({
				_id: "two-way-pitch-only",
				Name: "Pitch Side Only",
				_battingStats: {
					...createTwoWay({})._battingStats,
					PA: 4,
				},
				_pitchingStats: {
					...createTwoWay({})._pitchingStats,
					IP: 12,
					GS: 2,
					SO: 12,
				},
				eligibility: {
					positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 0, RF: 0, DH: 0 },
					eligiblePositions: [],
					isSP: true,
					isRP: false,
					sourceSeason: 2025,
					updatedAt: "2026-03-22T00:00:00.000Z",
				},
			}),
			createTwoWay({
				_id: "two-way-fringe",
				Name: "Fringe Two Way",
				_battingStats: {
					...createTwoWay({})._battingStats,
					PA: 4,
				},
				_pitchingStats: {
					...createTwoWay({})._pitchingStats,
					IP: 2,
				},
				eligibility: {
					positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 0, RF: 0, DH: 0 },
					eligiblePositions: [],
					isSP: true,
					isRP: false,
					sourceSeason: 2025,
					updatedAt: "2026-03-22T00:00:00.000Z",
				},
			})
		);

		const allRows = buildBaseRankedPlayers({
			activeGroup: group,
			playerView: "all",
			scoringSettings: createScoringSettings(),
			leagueSettings: createLeagueSettings(),
			draftState: createDraftState(),
			mergeTwoWayRankings: true,
		});
		const batterRows = buildBaseRankedPlayers({
			activeGroup: group,
			playerView: "batters",
			scoringSettings: createScoringSettings(),
			leagueSettings: createLeagueSettings(),
			draftState: createDraftState(),
			mergeTwoWayRankings: true,
		});
		const pitcherRows = buildBaseRankedPlayers({
			activeGroup: group,
			playerView: "pitchers",
			scoringSettings: createScoringSettings(),
			leagueSettings: createLeagueSettings(),
			draftState: createDraftState(),
			mergeTwoWayRankings: true,
		});

		expect(allRows.map((row) => row.player._id)).toContain("two-way-bat-only");
		expect(allRows.map((row) => row.player._id)).toContain("two-way-pitch-only");
		expect(allRows.map((row) => row.player._id)).not.toContain("two-way-fringe");
		expect(batterRows.map((row) => row.player._id)).toContain("two-way-bat-only");
		expect(batterRows.map((row) => row.player._id)).not.toContain("two-way-pitch-only");
		expect(pitcherRows.map((row) => row.player._id)).toContain("two-way-pitch-only");
		expect(pitcherRows.map((row) => row.player._id)).not.toContain("two-way-bat-only");
	});

	it("matches accented names when the search input omits accents", () => {
		const rows = buildFilterMetadata([
			{
				player: createPitcher({
					_id: "pitcher-accented",
					Name: "José Berríos",
					Team: "TOR",
				}),
				projectedPoints: 150,
				par: 12,
				isDrafted: false,
				isKeeper: false,
			},
		]);

		const filtered = filterRankedPlayers({
			rows,
			selectedPositions: new Set(),
			isDraftMode: false,
			draftFilter: "all",
			search: "jose berrios",
		});

		expect(filtered).toHaveLength(1);
		expect(filtered[0]?.player.Name).toBe("José Berríos");
	});

	it("sorts rows before search so rank order stays stable", () => {
		const rows = sortLeaderboardRows(
			buildFilterMetadata([
				{
					player: createBatter({ _id: "a", Name: "Alpha", Team: "A" }),
					projectedPoints: 300,
					par: 10,
					isDrafted: false,
					isKeeper: false,
				},
				{
					player: createBatter({ _id: "b", Name: "Bravo", Team: "B" }),
					projectedPoints: 200,
					par: 5,
					isDrafted: false,
					isKeeper: false,
				},
			]),
			[{ id: "projectedPoints", desc: true }]
		);

		expect(rows.map((row) => row.player._id)).toEqual(["a", "b"]);
	});
});
