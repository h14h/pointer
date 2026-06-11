import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Leaderboard, formatParForDisplay } from "@/components/Leaderboard";
import type {
	BatterPlayer,
	DraftState,
	League,
	LeagueSettings,
	PitcherPlayer,
	ProjectionGroup,
	ScoringSettings,
	TwoWayPlayer,
} from "@/types";

const useStoreMock = vi.fn();
const { toastSpy } = vi.hoisted(() => ({
	toastSpy: vi.fn(),
}));

vi.mock("@/store", () => ({
	useStore: (selector?: (state: ReturnType<typeof useStoreMock>) => unknown) => {
		const state = useStoreMock();
		return selector ? selector(state) : state;
	},
}));

vi.mock("sonner", () => ({
	toast: toastSpy,
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
				OF: 2,
				UTIL: 1,
				SP: 0,
				RP: 0,
				P: 3,
				IL: 0,
				NA: 0,
			},
			bench: 3,
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

function createLeague(): League {
	return {
		id: "league-1",
		name: "My League",
		scoringSettings: createScoringSettings(),
		leagueSettings: createLeagueSettings(),
		draftState: createDraftState(),
		updatedAt: Date.now(),
	};
}

function createBatter(overrides: Partial<BatterPlayer>): BatterPlayer {
	return {
		_type: "batter",
		_id: overrides._id ?? crypto.randomUUID(),
		Name: overrides.Name ?? "Batter",
		Team: overrides.Team ?? "AAA",
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
		Team: overrides.Team ?? "BBB",
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
		Team: overrides.Team ?? "CCC",
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

function createProjectionGroup(totalBatters = 3): ProjectionGroup {
	const batters: BatterPlayer[] = [
		createBatter({
			_id: "batter-mike",
			Name: "Mike Trout",
			Team: "LAA",
			PA: 620,
			AB: 540,
			HR: 40,
			R: 100,
			RBI: 95,
			BB: 70,
			"1B": 60,
			eligibility: {
				positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 100, RF: 0, DH: 0 },
				eligiblePositions: ["CF"],
				isSP: false,
				isRP: false,
				sourceSeason: 2025,
				updatedAt: "2026-03-22T00:00:00.000Z",
			},
		}),
		createBatter({
			_id: "batter-corey",
			Name: "Corey Seager",
			Team: "TEX",
			PA: 610,
			AB: 530,
			HR: 30,
			R: 85,
			RBI: 88,
			BB: 50,
			"1B": 55,
			eligibility: {
				positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 120, LF: 0, CF: 0, RF: 0, DH: 0 },
				eligiblePositions: ["SS"],
				isSP: false,
				isRP: false,
				sourceSeason: 2025,
				updatedAt: "2026-03-22T00:00:00.000Z",
			},
		}),
	];

	for (let index = batters.length; index < totalBatters; index += 1) {
		batters.push(
			createBatter({
				_id: `batter-${index}`,
				Name: `Filler ${index}`,
				Team: "AAA",
				PA: 120,
				AB: 100,
				HR: 1,
				R: 5,
				RBI: 5,
				"1B": 10,
				eligibility: {
					positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 80, RF: 0, DH: 0 },
					eligiblePositions: ["CF"],
					isSP: false,
					isRP: false,
					sourceSeason: 2025,
					updatedAt: "2026-03-22T00:00:00.000Z",
				},
			})
		);
	}

	return {
		id: "group-1",
		name: "Main Group",
		createdAt: "2026-03-22T00:00:00.000Z",
		source: { kind: "upload" },
		batterIdSource: "MLBAMID",
		pitcherIdSource: "MLBAMID",
		batters,
		pitchers: [
			createPitcher({
				_id: "pitcher-ace",
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
				_id: "two-way-ohtani",
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

function mockStore(overrides: Partial<ReturnType<typeof createStoreState>> = {}) {
	useStoreMock.mockReturnValue({
		...createStoreState(),
		...overrides,
	});
}

function createStoreState() {
	const league = createLeague();
	return {
		projectionGroups: [createProjectionGroup()],
		activeProjectionGroupId: "group-1",
		setActiveProjectionGroup: vi.fn(),
		isDraftMode: false,
		draftPlayer: vi.fn(),
		undoLastPick: vi.fn(),
		mergeTwoWayRankings: true,
		leagues: [league],
		activeLeagueId: league.id,
	};
}

describe("Leaderboard", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("formats rounded zero PAR without a plus sign", () => {
		expect(formatParForDisplay(0)).toBe("0");
		expect(formatParForDisplay(0.4)).toBe("0");
		expect(formatParForDisplay(-0.4)).toBe("0");
		expect(formatParForDisplay(1.2)).toBe("+1");
		expect(formatParForDisplay(-1.2)).toBe("-1");
	});

	it("keeps rank numbers from the pre-search sorted leaderboard", async () => {
		const user = userEvent.setup();
		mockStore();
		render(<Leaderboard />);

		await user.type(screen.getByPlaceholderText("Search players..."), "tex");

		const row = await screen.findByText("C. Seager");
		const tableRow = row.closest("tr");
		expect(tableRow).not.toBeNull();
		expect(within(tableRow as HTMLTableRowElement).getByText("4")).toBeVisible();
	});

	it("resets pagination after applying a position filter", async () => {
		mockStore({
			projectionGroups: [createProjectionGroup(26)],
		});
		render(<Leaderboard />);

		fireEvent.click(screen.getByRole("button", { name: "Next" }));
		await waitFor(() => {
			expect(screen.getByText(/Page 2 of/i)).toBeVisible();
		});

		fireEvent.click(screen.getByRole("button", { name: "Position" }));
		const positionMenuLabel = await screen.findByText("Filter by Position");
		const positionMenu = positionMenuLabel.parentElement?.parentElement;
		expect(positionMenu).not.toBeNull();
		fireEvent.click(within(positionMenu as HTMLElement).getByRole("button", { name: "SS" }));

		await waitFor(() => {
			expect(screen.getByText(/Page 1 of 1/)).toBeVisible();
		});
		expect(screen.getByText("C. Seager")).toBeVisible();
	});

	it("switches player type without showing batter-only rows", async () => {
		const user = userEvent.setup();
		mockStore();
		render(<Leaderboard />);

		await user.click(screen.getByRole("button", { name: "Player type" }));
		await user.click(screen.getByRole("button", { name: "Pitchers" }));

		await waitFor(() => {
			expect(screen.getByText("G. Cole")).toBeVisible();
		});
		expect(screen.getByText("S. Ohtani")).toBeVisible();
		expect(screen.queryByRole("columnheader", { name: "AVG" })).toBeNull();
	});

	it("drafts the current player with a single click in draft mode", async () => {
		const user = userEvent.setup();
		const draftPlayer = vi.fn();
		mockStore({
			isDraftMode: true,
			draftPlayer,
		});
		render(<Leaderboard />);

		const row = screen.getByText("M. Trout").closest("tr");
		expect(row).not.toBeNull();

		await user.click(row as HTMLTableRowElement);

		expect(draftPlayer).toHaveBeenCalledWith("batter-mike");
		expect(toastSpy).toHaveBeenCalledWith(
			"Mike Trout",
			expect.objectContaining({
				description: "Team 1 • Pick 1",
				duration: 2600,
			}),
		);
	});

	it("shows an auto-advance toast when draft mode skips an opening keeper slot", async () => {
		vi.useFakeTimers();
		mockStore({
			isDraftMode: true,
			leagues: [
				{
					...createLeague(),
					draftState: {
						format: "snake",
						draftedByTeam: {},
						keeperByTeam: { "batter-mike": "0" },
						keeperSlotByPlayer: { "batter-mike": 0 },
						pickIndex: 0,
						history: [],
					},
				},
			],
		});

		render(<Leaderboard />);

		expect(toastSpy).not.toHaveBeenCalled();
		await act(async () => {
			vi.advanceTimersByTime(700);
		});
		const [toastTitle, toastOptions] = toastSpy.mock.calls[0] ?? [];
		expect(toastTitle).toBeTruthy();
		expect((toastTitle as { props: { children: Array<{ props: { children: string } }> } }).props.children[0].props.children).toBe(
			"Mike Trout",
		);
		expect((toastTitle as { props: { children: Array<{ props: { children: string } }> } }).props.children[1].props.children).toBe(
			"K",
		);
		expect(toastOptions).toEqual(
			expect.objectContaining({
				description: "Team 1 • Pick 1",
			}),
		);
	});

	it("shows auto-rewind before the undone-pick toast when undo crosses a keeper slot", async () => {
		vi.useFakeTimers();
		const league = createLeague();
		let currentState = createStoreState();
		currentState = {
			...currentState,
			isDraftMode: true,
			leagues: [
				{
					...league,
					leagueSettings: {
						...league.leagueSettings,
						leagueSize: 4,
						teamNames: ["Team 1", "Team 2", "Team 3", "Team 4"],
					},
					draftState: {
						format: "snake",
						draftedByTeam: {
							"batter-mike": "0",
							"batter-corey": "1",
						},
						keeperByTeam: { "pitcher-ace": "2" },
						keeperSlotByPlayer: { "pitcher-ace": 2 },
						pickIndex: 3,
						history: [
							{
								playerId: "batter-mike",
								teamIndex: 0,
								slotIndex: 0,
								overallPick: 1,
								round: 1,
								pickInRound: 1,
								timestamp: 1,
							},
							{
								playerId: "batter-corey",
								teamIndex: 1,
								slotIndex: 1,
								overallPick: 2,
								round: 1,
								pickInRound: 2,
								timestamp: 2,
							},
						],
					},
					updatedAt: Date.now(),
				},
			],
		};
		currentState.undoLastPick = vi.fn(() => {
			currentState = {
				...currentState,
				leagues: currentState.leagues.map((activeLeague) =>
					activeLeague.id !== league.id
						? activeLeague
						: {
							...activeLeague,
							draftState: {
								...activeLeague.draftState,
								draftedByTeam: { "batter-mike": "0" },
								pickIndex: 1,
								history: [activeLeague.draftState.history[0]],
							},
						},
				),
			};
		});
		useStoreMock.mockImplementation((selector?: (state: ReturnType<typeof useStoreMock>) => unknown) => {
			return selector ? selector(currentState) : currentState;
		});

		const { rerender } = render(<Leaderboard />);

		await act(async () => {
			vi.advanceTimersByTime(700);
		});
		toastSpy.mockClear();

		fireEvent.click(screen.getByRole("button", { name: "Undo Last Pick" }));
		rerender(<Leaderboard />);

		expect(toastSpy).toHaveBeenCalledTimes(1);
		expect(toastSpy).toHaveBeenNthCalledWith(
			1,
			"Auto-rewound",
			expect.objectContaining({
				description: "Gerrit Cole • Pick 3",
			}),
		);

		await act(async () => {
			vi.advanceTimersByTime(220);
		});
		expect(toastSpy).toHaveBeenCalledTimes(2);
		expect(toastSpy).toHaveBeenNthCalledWith(
			2,
			"Pick undone",
			expect.objectContaining({
				description: "Corey Seager • Team 2 • Pick 2",
				duration: 2200,
			}),
		);
	});

	it("keeps drafted rows readable in non-draft mode and shows ownership in a badge tooltip", async () => {
		const user = userEvent.setup();
		mockStore({
			leagues: [
				{
					...createLeague(),
					draftState: {
						format: "snake",
						draftedByTeam: { "batter-mike": "1" },
						keeperByTeam: {},
						keeperSlotByPlayer: {},
						pickIndex: 1,
						history: [],
					},
				},
			],
		});

		render(<Leaderboard />);

		const nameCell = screen.getByText("M. Trout");
		expect(nameCell.className).not.toContain("line-through");
		expect(nameCell.className).not.toContain("text-[var(--color-fg-subtle)]");

		const draftedBadge = screen.getByText("D");
		expect(draftedBadge).toHaveTextContent("D");
		expect(draftedBadge).toHaveAttribute("tabindex", "0");

		await user.hover(draftedBadge);
		expect(await screen.findByRole("tooltip")).toHaveTextContent("Team 2");
	});
});
