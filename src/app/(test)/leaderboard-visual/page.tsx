"use client";

/**
 * Test fixture page for visual regression testing.
 *
 * Renders the Leaderboard component with deterministic data so Playwright
 * screenshot tests produce stable baselines. Not linked in the production UI.
 *
 * URL params control variant:
 *   ?variant=default      — all-players view (default)
 *   ?variant=draft         — draft mode with some players drafted / kept
 *   ?variant=pitchers      — pitchers-only view
 */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "@/lib/routing/adapter";
import { Leaderboard } from "@/components/Leaderboard";
import { useStore } from "@/store";
import type {
	BatterPlayer,
	DraftState,
	Eligibility,
	League,
	LeagueSettings,
	PitcherPlayer,
	Position,
	ProjectionGroup,
	ScoringSettings,
	TwoWayPlayer,
} from "@/types";

// ---------------------------------------------------------------------------
// Deterministic fixture data
// ---------------------------------------------------------------------------

function scoringSettings(): ScoringSettings {
	return {
		name: "Default",
		batting: {
			R: 1, H: 0, "1B": 1, "2B": 2, "3B": 3, HR: 4,
			RBI: 1, SB: 1, CS: -1, BB: 1, IBB: 0, SO: -1, HBP: 1, SF: 0, GDP: 0,
		},
		pitching: {
			IP: 3, W: 5, L: -5, QS: 3, CG: 0, ShO: 0, SV: 5, BS: -3,
			HLD: 2, SO: 1, H: -1, ER: -2, HR: -1, BB: -1, HBP: -1,
		},
	};
}

function leagueSettings(): LeagueSettings {
	return {
		leagueSize: 12,
		teamNames: Array.from({ length: 12 }, (_, i) => `Team ${i + 1}`),
		weeklyStartLimit: null,
		roster: {
			positions: {
				C: 1, "1B": 1, "2B": 1, "3B": 1, SS: 1,
				LF: 0, CF: 0, RF: 0, DH: 0,
				CI: 0, MI: 0, IF: 0, OF: 3, UTIL: 1,
				SP: 0, RP: 0, P: 5, IL: 0, NA: 0,
			},
			bench: 3,
		},
	};
}

function draftState(variant: string): DraftState {
	if (variant === "draft") {
		return {
			format: "snake",
			draftedByTeam: {
				"batter-trout": "0",
				"pitcher-cole": "1",
			},
			keeperByTeam: { "batter-acuna": "2" },
			keeperSlotByPlayer: { "batter-acuna": 24 },
			pickIndex: 3,
			history: [
				{ playerId: "batter-trout", teamIndex: 0, slotIndex: 0, overallPick: 1, round: 1, pickInRound: 1, timestamp: 1 },
				{ playerId: "pitcher-cole", teamIndex: 1, slotIndex: 1, overallPick: 2, round: 1, pickInRound: 2, timestamp: 2 },
			],
		};
	}
	return {
		format: "snake",
		draftedByTeam: {},
		keeperByTeam: {},
		keeperSlotByPlayer: {},
		pickIndex: 0,
		history: [],
	};
}

function league(variant: string): League {
	return {
		id: "visual-test-league",
		name: "Visual Test League",
		sport: "baseball",
		scoringSettings: scoringSettings(),
		leagueSettings: leagueSettings(),
		draftState: draftState(variant),
		updatedAt: 1711152000000, // fixed timestamp
	};
}

// -- Player factories -------------------------------------------------------

const elig = (positions: Position[], sp = false, rp = false): Eligibility => ({
	positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 0, RF: 0, DH: 0 },
	eligiblePositions: positions,
	isSP: sp,
	isRP: rp,
	sourceSeason: 2025,
	updatedAt: "2026-03-22T00:00:00.000Z",
});

function batter(overrides: Partial<BatterPlayer> & { _id: string; Name: string }): BatterPlayer {
	return {
		_type: "batter", Team: "AAA", PlayerId: overrides._id, MLBAMID: overrides._id,
		G: 0, PA: 0, AB: 0, H: 0, "1B": 0, "2B": 0, "3B": 0, HR: 0,
		R: 0, RBI: 0, BB: 0, IBB: 0, SO: 0, HBP: 0, SF: 0, SH: 0, GDP: 0,
		SB: 0, CS: 0, AVG: 0.25, OBP: 0.3, SLG: 0.4, OPS: 0.7, ISO: 0.15,
		BABIP: 0.3, "wRC+": 100, WAR: 0, ADP: null,
		...overrides,
	};
}

function pitcher(overrides: Partial<PitcherPlayer> & { _id: string; Name: string }): PitcherPlayer {
	return {
		_type: "pitcher", Team: "AAA", PlayerId: overrides._id, MLBAMID: overrides._id,
		W: 0, L: 0, QS: 0, CG: 0, ShO: 0, G: 0, GS: 0, SV: 0, HLD: 0, BS: 0,
		IP: 0, H: 0, R: 0, ER: 0, HR: 0, BB: 0, IBB: 0, HBP: 0, SO: 0,
		ERA: 4.00, WHIP: 1.25, "K/9": 9, "BB/9": 3, FIP: 4.0, WAR: 0, ADP: null,
		...overrides,
	};
}

function twoWay(overrides: Partial<TwoWayPlayer> & { _id: string; Name: string }): TwoWayPlayer {
	return {
		_type: "two-way", Team: "AAA", PlayerId: overrides._id, MLBAMID: overrides._id,
		ADP: null,
		_battingStats: {
			G: 0, PA: 0, AB: 0, H: 0, "1B": 0, "2B": 0, "3B": 0, HR: 0,
			R: 0, RBI: 0, BB: 0, IBB: 0, SO: 0, HBP: 0, SF: 0, SH: 0, GDP: 0,
			SB: 0, CS: 0, AVG: 0.25, OBP: 0.3, SLG: 0.4, OPS: 0.7, ISO: 0.15,
			BABIP: 0.3, "wRC+": 100, WAR: 0,
		},
		_pitchingStats: {
			W: 0, L: 0, QS: 0, CG: 0, ShO: 0, G: 0, GS: 0, SV: 0, HLD: 0, BS: 0,
			IP: 0, H: 0, R: 0, ER: 0, HR: 0, BB: 0, IBB: 0, HBP: 0, SO: 0,
			ERA: 4.00, WHIP: 1.25, "K/9": 9, "BB/9": 3, FIP: 4.0, WAR: 0,
		},
		...overrides,
	};
}

// -- Projection data --------------------------------------------------------

function projectionGroup(): ProjectionGroup {
	return {
		id: "visual-test-group",
		name: "Visual Test Projections",
		sport: "baseball",
		createdAt: "2026-03-22T00:00:00.000Z",
		source: { kind: "upload" },
		batterIdSource: "MLBAMID",
		pitcherIdSource: "MLBAMID",
		batters: [
			batter({ _id: "batter-trout", Name: "Mike Trout", Team: "LAA", PA: 620, AB: 540, HR: 40, R: 100, RBI: 95, BB: 70, "1B": 60, "2B": 25, "3B": 2, SB: 12, SO: 140, AVG: 0.283, ADP: 15, eligibility: elig(["CF"]) }),
			batter({ _id: "batter-acuna", Name: "Ronald Acuna Jr.", Team: "ATL", PA: 660, AB: 570, HR: 38, R: 110, RBI: 90, BB: 75, "1B": 65, "2B": 28, "3B": 4, SB: 40, SO: 130, AVG: 0.291, ADP: 1, eligibility: elig(["RF"]) }),
			batter({ _id: "batter-soto", Name: "Juan Soto", Team: "NYM", PA: 680, AB: 540, HR: 35, R: 105, RBI: 100, BB: 130, "1B": 50, "2B": 30, "3B": 1, SB: 5, SO: 120, AVG: 0.290, ADP: 3, eligibility: elig(["RF", "LF"]) }),
			batter({ _id: "batter-judge", Name: "Aaron Judge", Team: "NYY", PA: 640, AB: 550, HR: 50, R: 115, RBI: 120, BB: 78, "1B": 45, "2B": 22, "3B": 1, SB: 3, SO: 170, AVG: 0.275, ADP: 2, eligibility: elig(["CF", "RF"]) }),
			batter({ _id: "batter-tatis", Name: "Fernando Tatis Jr.", Team: "SDP", PA: 600, AB: 530, HR: 35, R: 95, RBI: 85, BB: 55, "1B": 55, "2B": 24, "3B": 3, SB: 25, SO: 155, AVG: 0.270, ADP: 8, eligibility: elig(["RF", "SS"]) }),
			batter({ _id: "batter-seager", Name: "Corey Seager", Team: "TEX", PA: 610, AB: 530, HR: 30, R: 85, RBI: 88, BB: 50, "1B": 55, "2B": 26, "3B": 1, SB: 2, SO: 110, AVG: 0.278, ADP: 25, eligibility: elig(["SS"]) }),
			batter({ _id: "batter-betts", Name: "Mookie Betts", Team: "LAD", PA: 650, AB: 560, HR: 28, R: 105, RBI: 82, BB: 72, "1B": 68, "2B": 35, "3B": 2, SB: 15, SO: 100, AVG: 0.285, ADP: 6, eligibility: elig(["SS", "RF"]) }),
			batter({ _id: "batter-turner", Name: "Trea Turner", Team: "PHI", PA: 620, AB: 560, HR: 22, R: 95, RBI: 70, BB: 45, "1B": 80, "2B": 28, "3B": 5, SB: 28, SO: 120, AVG: 0.280, ADP: 12, eligibility: elig(["SS"]) }),
			batter({ _id: "batter-ramirez", Name: "Jose Ramirez", Team: "CLE", PA: 630, AB: 560, HR: 28, R: 90, RBI: 100, BB: 55, "1B": 65, "2B": 32, "3B": 2, SB: 18, SO: 85, AVG: 0.275, ADP: 7, eligibility: elig(["3B"]) }),
			batter({ _id: "batter-riley", Name: "Austin Riley", Team: "ATL", PA: 600, AB: 540, HR: 32, R: 80, RBI: 95, BB: 48, "1B": 58, "2B": 30, "3B": 1, SB: 2, SO: 145, AVG: 0.268, ADP: 30, eligibility: elig(["3B"]) }),
			batter({ _id: "batter-arenado", Name: "Nolan Arenado", Team: "HOU", PA: 580, AB: 520, HR: 25, R: 70, RBI: 80, BB: 45, "1B": 60, "2B": 28, "3B": 1, SB: 1, SO: 95, AVG: 0.265, ADP: 55, eligibility: elig(["3B"]) }),
			batter({ _id: "batter-freeman", Name: "Freddie Freeman", Team: "LAD", PA: 660, AB: 580, HR: 25, R: 100, RBI: 90, BB: 65, "1B": 80, "2B": 35, "3B": 2, SB: 8, SO: 105, AVG: 0.300, ADP: 10, eligibility: elig(["1B"]) }),
		],
		pitchers: [
			pitcher({ _id: "pitcher-cole", Name: "Gerrit Cole", Team: "NYY", W: 14, L: 5, QS: 20, SO: 220, IP: 190, ER: 55, H: 140, BB: 38, HR: 18, HBP: 5, GS: 30, ERA: 2.60, WHIP: 0.94, ADP: 18, eligibility: elig([], true) }),
			pitcher({ _id: "pitcher-burns", Name: "Corbin Burnes", Team: "BAL", W: 12, L: 6, QS: 18, SO: 200, IP: 185, ER: 62, H: 150, BB: 42, HR: 20, HBP: 4, GS: 30, ERA: 3.02, WHIP: 1.04, ADP: 22, eligibility: elig([], true) }),
			pitcher({ _id: "pitcher-webb", Name: "Logan Webb", Team: "SFG", W: 13, L: 7, QS: 19, SO: 175, IP: 195, ER: 68, H: 170, BB: 35, HR: 15, HBP: 3, GS: 32, ERA: 3.14, WHIP: 1.05, ADP: 35, eligibility: elig([], true) }),
			pitcher({ _id: "pitcher-diaz", Name: "Edwin Diaz", Team: "NYM", W: 4, L: 2, QS: 0, SO: 80, SV: 35, IP: 65, ER: 18, H: 40, BB: 20, HR: 5, HBP: 2, G: 60, ERA: 2.49, WHIP: 0.92, ADP: 48, eligibility: elig([], false, true) }),
			pitcher({ _id: "pitcher-hader", Name: "Josh Hader", Team: "HOU", W: 3, L: 3, QS: 0, SO: 75, SV: 38, IP: 60, ER: 16, H: 38, BB: 18, HR: 4, HBP: 1, G: 58, ERA: 2.40, WHIP: 0.93, ADP: 42, eligibility: elig([], false, true) }),
			pitcher({ _id: "pitcher-strider", Name: "Spencer Strider", Team: "ATL", W: 11, L: 5, QS: 16, SO: 230, IP: 170, ER: 58, H: 120, BB: 45, HR: 22, HBP: 6, GS: 28, ERA: 3.07, WHIP: 0.97, ADP: 20, eligibility: elig([], true) }),
		],
		twoWayPlayers: [
			twoWay({
				_id: "two-way-ohtani", Name: "Shohei Ohtani", Team: "LAD", ADP: 1,
				_battingStats: {
					G: 150, PA: 600, AB: 500, H: 145, "1B": 60, "2B": 25, "3B": 3, HR: 40,
					R: 100, RBI: 95, BB: 85, IBB: 10, SO: 130, HBP: 8, SF: 3, SH: 0, GDP: 8,
					SB: 25, CS: 5, AVG: 0.290, OBP: 0.390, SLG: 0.580, OPS: 0.970,
					ISO: 0.290, BABIP: 0.310, "wRC+": 165, WAR: 7,
				},
				_pitchingStats: {
					W: 12, L: 4, QS: 15, CG: 1, ShO: 0, G: 25, GS: 25, SV: 0, HLD: 0, BS: 0,
					IP: 155, H: 105, R: 45, ER: 42, HR: 16, BB: 40, IBB: 0, HBP: 5, SO: 190,
					ERA: 2.44, WHIP: 0.94, "K/9": 11.0, "BB/9": 2.3, FIP: 2.9, WAR: 5,
				},
				eligibility: elig(["DH"], true),
			}),
		],
	};
}

// ---------------------------------------------------------------------------
// Seed the store then render
// ---------------------------------------------------------------------------

function useVariant(): string {
	const params = useSearchParams();
	return params?.get("variant") ?? "default";
}

function StoreSeeder({ variant, onReady }: { variant: string; onReady: () => void }) {
	useEffect(() => {
		// Seed store with deterministic data (bypass normal hydration)
		useStore.setState({
			leagues: [league(variant)],
			activeLeagueId: "visual-test-league",
			projectionGroups: [projectionGroup()],
			activeProjectionGroupId: "visual-test-group",
			isDraftMode: variant === "draft",
			mergeTwoWayRankings: true,
			hasHydrated: true,
		});
		onReady();
	}, [variant, onReady]);

	return null;
}

function LeaderboardVisualTestPageInner() {
	const variant = useVariant();
	const [ready, setReady] = useState(false);

	return (
		<div className="min-h-screen">
			<StoreSeeder variant={variant} onReady={() => setReady(true)} />
			{ready && (
				<main
					className="mx-auto max-w-[var(--width-page)] px-[var(--space-page-x)] py-6 sm:px-[var(--space-page-x-sm)] sm:py-8"
					data-testid="leaderboard-visual"
				>
					<Leaderboard />
				</main>
			)}
		</div>
	);
}

export default function LeaderboardVisualTestPage() {
	return (
		<Suspense>
			<LeaderboardVisualTestPageInner />
		</Suspense>
	);
}
