"use client";

import {
	useMemo,
	useState,
	useCallback,
	useDeferredValue,
	useEffect,
	memo,
	type Dispatch,
	type SetStateAction,
} from "react";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	flexRender,
	type SortingState,
	type ColumnDef,
} from "@tanstack/react-table";
import { useStore } from "@/store";
import { calculatePlayerPoints } from "@/lib/calculatePoints";
import { POSITION_ORDER } from "@/lib/eligibility";
import {
	resolveQualityStarts,
	resolveCompleteGames,
	resolveShutouts,
} from "@/lib/pitchingOutcomes";
import { isValidBaseballIp } from "@/lib/ipMath";
import type {
	Player,
	RankedPlayer,
	DraftState,
	ScoringSettings,
	ProjectionGroup,
	LeagueSettings,
} from "@/types";

type PlayerView = "all" | "batters" | "pitchers";
type DraftFilter = "all" | "available" | "drafted" | "keepers";
type StatOption = { id: string; label: string };

const BATTING_STAT_OPTIONS: StatOption[] = [
	{ id: "H", label: "H" },
	{ id: "1B", label: "1B" },
	{ id: "2B", label: "2B" },
	{ id: "3B", label: "3B" },
	{ id: "HR", label: "HR" },
	{ id: "TB", label: "TB" },
	{ id: "R", label: "R" },
	{ id: "RBI", label: "RBI" },
	{ id: "BB", label: "BB" },
	{ id: "HBP", label: "HBP" },
	{ id: "SO", label: "SO" },
	{ id: "SB", label: "SB" },
	{ id: "CS", label: "CS" },
	{ id: "SF", label: "SF" },
	{ id: "GDP", label: "GIDP" },
	{ id: "AVG", label: "AVG" },
];

const PITCHING_STAT_OPTIONS: StatOption[] = [
	{ id: "IP", label: "IP" },
	{ id: "SO_P", label: "K" },
	{ id: "H_P", label: "H" },
	{ id: "ER", label: "ER" },
	{ id: "HR_P", label: "HR" },
	{ id: "BB_P", label: "BB" },
	{ id: "HBP_P", label: "HBP" },
	{ id: "W", label: "W" },
	{ id: "L", label: "L" },
	{ id: "QS", label: "QS" },
	{ id: "SV", label: "SV" },
	{ id: "HLD", label: "HLD" },
	{ id: "BS", label: "BS" },
	{ id: "CG", label: "CG" },
	{ id: "ShO", label: "ShO" },
	{ id: "ERA", label: "ERA" },
	{ id: "WHIP", label: "WHIP" },
];

const STORAGE_KEYS = {
	batting: "leaderboard:batting-stats",
	pitching: "leaderboard:pitching-stats",
} as const;

const DEFAULT_BATTING_STATS = ["R", "HR", "RBI", "SB", "AVG"];
const DEFAULT_PITCHING_STATS = ["W", "SV", "SO_P", "ERA", "WHIP"];

const formatCountingStat = (value: number | null) =>
	value === null || Number.isNaN(value) ? "-" : Math.round(value);

function formatEligibility(player: Player): string {
	const eligibility = player.eligibility;
	if (!eligibility) return "-";

	const parts: string[] = [];
	const eligibleSet = new Set(eligibility.eligiblePositions);
	const orderedPositions = POSITION_ORDER.filter((pos) => eligibleSet.has(pos));
	if (orderedPositions.length > 0) {
		parts.push(orderedPositions.join(","));
	}
	if (eligibility.isSP) parts.push("SP");
	if (eligibility.isRP) parts.push("RP");

	return parts.length > 0 ? parts.join(" / ") : "-";
}

export function Leaderboard() {
	const {
		projectionGroups,
		activeProjectionGroupId,
		setActiveProjectionGroup,
		scoringSettings,
		leagueSettings,
		draftState,
		isDraftMode,
		toggleDraftedForTeam,
		toggleKeeperForTeam,
		mergeTwoWayRankings,
	} = useStore();
	const currentGroupId =
		activeProjectionGroupId ?? projectionGroups[0]?.id ?? null;
	const deferredGroupId = useDeferredValue(currentGroupId);
	const isSwitchingGroups = deferredGroupId !== currentGroupId;
	const [globalFilter, setGlobalFilter] = useState("");
	const [playerView, setPlayerView] = useState<PlayerView>("all");
	const [draftFilter, setDraftFilter] = useState<DraftFilter>("available");
	const [isStatsOpen, setIsStatsOpen] = useState(false);
	const [selectedBattingStats, setSelectedBattingStats] = useState<string[]>(
		() => DEFAULT_BATTING_STATS,
	);
	const [selectedPitchingStats, setSelectedPitchingStats] = useState<string[]>(
		() => DEFAULT_PITCHING_STATS,
	);

	const battingStatSet = useMemo(
		() => new Set(selectedBattingStats),
		[selectedBattingStats],
	);
	const pitchingStatSet = useMemo(
		() => new Set(selectedPitchingStats),
		[selectedPitchingStats],
	);

	useEffect(() => {
		const parseStored = (key: string, fallback: string[]) => {
			if (typeof window === "undefined") return fallback;
			try {
				const raw = window.localStorage.getItem(key);
				if (!raw) return fallback;
				const parsed = JSON.parse(raw);
				return Array.isArray(parsed)
					? parsed.filter((val) => typeof val === "string")
					: fallback;
			} catch {
				return fallback;
			}
		};

		const battingOptions = new Set(
			BATTING_STAT_OPTIONS.map((stat) => stat.id),
		);
		const pitchingOptions = new Set(
			PITCHING_STAT_OPTIONS.map((stat) => stat.id),
		);

		setSelectedBattingStats(
			parseStored(STORAGE_KEYS.batting, DEFAULT_BATTING_STATS).filter((statId) =>
				battingOptions.has(statId),
			),
		);
		setSelectedPitchingStats(
			parseStored(STORAGE_KEYS.pitching, DEFAULT_PITCHING_STATS).filter(
				(statId) => pitchingOptions.has(statId),
			),
		);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(
			STORAGE_KEYS.batting,
			JSON.stringify(selectedBattingStats),
		);
	}, [selectedBattingStats]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(
			STORAGE_KEYS.pitching,
			JSON.stringify(selectedPitchingStats),
		);
	}, [selectedPitchingStats]);

	const toggleStat = useCallback(
		(
			group: "batting" | "pitching",
			statId: string,
			checked: boolean,
		) => {
			if (group === "batting") {
				setSelectedBattingStats((current) =>
					checked
						? Array.from(new Set([...current, statId]))
						: current.filter((id) => id !== statId),
				);
				return;
			}

			setSelectedPitchingStats((current) =>
				checked
					? Array.from(new Set([...current, statId]))
					: current.filter((id) => id !== statId),
			);
		},
		[],
	);

	const applyAllStats = useCallback((group: "batting" | "pitching") => {
		if (group === "batting") {
			setSelectedBattingStats(BATTING_STAT_OPTIONS.map((stat) => stat.id));
			return;
		}

		setSelectedPitchingStats(PITCHING_STAT_OPTIONS.map((stat) => stat.id));
	}, []);

	const clearAllStats = useCallback((group: "batting" | "pitching") => {
		if (group === "batting") {
			setSelectedBattingStats([]);
			return;
		}

		setSelectedPitchingStats([]);
	}, []);
	return (
		<div className="flex flex-col">
			{/* Filters */}
			<div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
				<div className="flex flex-wrap items-center gap-3">
					<input
						type="text"
						placeholder="Search players..."
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
						className="w-full min-w-[220px] flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40"
					/>

					<select
						value={playerView}
						onChange={(e) => setPlayerView(e.target.value as PlayerView)}
						className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40"
					>
						<option value="all">All Players</option>
						<option value="batters">Batters</option>
						<option value="pitchers">Pitchers</option>
					</select>

					{projectionGroups.length > 1 && (
						<div className="flex items-center gap-2">
							<select
								value={currentGroupId ?? ""}
								onChange={(e) => {
									const nextId = e.target.value;
									setActiveProjectionGroup(nextId);
								}}
								className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40"
							>
								{projectionGroups.map((group) => (
									<option key={group.id} value={group.id}>
										{group.name}
									</option>
								))}
							</select>
							{isSwitchingGroups && (
								<span
									className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-emerald-600"
									aria-label="Loading projections"
								/>
							)}
						</div>
					)}

					{isDraftMode && (
						<select
							value={draftFilter}
							onChange={(e) => setDraftFilter(e.target.value as DraftFilter)}
							className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40"
						>
							<option value="available">Available</option>
							<option value="all">All</option>
							<option value="drafted">Drafted</option>
							<option value="keepers">Keepers</option>
						</select>
					)}

					{isDraftMode && (
						<span className="text-xs text-slate-600 dark:text-slate-300">
							Click to draft, right-click for keeper
						</span>
					)}

					<button
						onClick={() => setIsStatsOpen((open) => !open)}
						className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
						aria-expanded={isStatsOpen}
						aria-controls="stat-visibility-panel"
					>
						{isStatsOpen ? "Hide Stats" : "Customize Stats"}
					</button>
				</div>
			</div>

			{isStatsOpen && (
				<div
					id="stat-visibility-panel"
					className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
								Visible Stats
							</p>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Toggle columns without changing scoring.
							</p>
						</div>
						<button
							onClick={() => setIsStatsOpen(false)}
							className="rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
						>
							Close
						</button>
					</div>
					<div className="mt-4 grid gap-4 lg:grid-cols-2">
						<div className="rounded-md bg-slate-50 dark:bg-slate-800 p-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
									Batting
								</span>
								<div className="flex items-center gap-2">
									<button
										onClick={() => applyAllStats("batting")}
										className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
									>
										All
									</button>
									<button
										onClick={() => clearAllStats("batting")}
										className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
									>
										None
									</button>
								</div>
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								{BATTING_STAT_OPTIONS.map((stat) => (
									<label
										key={stat.id}
										className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm"
									>
										<input
											type="checkbox"
											checked={battingStatSet.has(stat.id)}
											onChange={(event) =>
												toggleStat("batting", stat.id, event.target.checked)
											}
											className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-emerald-600"
										/>
										<span>{stat.label}</span>
									</label>
								))}
							</div>
						</div>
						<div className="rounded-md bg-slate-50 dark:bg-slate-800 p-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
									Pitching
								</span>
								<div className="flex items-center gap-2">
									<button
										onClick={() => applyAllStats("pitching")}
										className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
									>
										All
									</button>
									<button
										onClick={() => clearAllStats("pitching")}
										className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
									>
										None
									</button>
								</div>
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								{PITCHING_STAT_OPTIONS.map((stat) => (
									<label
										key={stat.id}
										className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm"
									>
										<input
											type="checkbox"
											checked={pitchingStatSet.has(stat.id)}
											onChange={(event) =>
												toggleStat("pitching", stat.id, event.target.checked)
											}
											className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-emerald-600"
										/>
										<span>{stat.label}</span>
									</label>
								))}
							</div>
						</div>
					</div>
				</div>
			)}



			{/* Table */}
			<div className="relative">
				{isSwitchingGroups && (
					<div className="pointer-events-none absolute inset-0 rounded-lg bg-black/10" />
				)}
				<LeaderboardTable
					projectionGroups={projectionGroups}
					activeGroupId={deferredGroupId}
					scoringSettings={scoringSettings}
					leagueSettings={leagueSettings}
					draftState={draftState}
					isDraftMode={isDraftMode}
					mergeTwoWayRankings={mergeTwoWayRankings}
					toggleDraftedForTeam={toggleDraftedForTeam}
					toggleKeeperForTeam={toggleKeeperForTeam}
					activeTeamIndex={draftState.activeTeamIndex}
					playerView={playerView}
					globalFilter={globalFilter}
					setGlobalFilter={setGlobalFilter}
					draftFilter={draftFilter}
					battingStatIds={selectedBattingStats}
					pitchingStatIds={selectedPitchingStats}
				/>
			</div>
		</div>
	);
}

type LeaderboardTableProps = {
	projectionGroups: ProjectionGroup[];
	activeGroupId: string | null;
	scoringSettings: ScoringSettings;
	leagueSettings: LeagueSettings;
	draftState: DraftState;
	isDraftMode: boolean;
	mergeTwoWayRankings: boolean;
	toggleDraftedForTeam: (playerId: string, teamIndex: number) => void;
	toggleKeeperForTeam: (playerId: string, teamIndex: number) => void;
	activeTeamIndex: number;
	playerView: PlayerView;
	globalFilter: string;
	setGlobalFilter: Dispatch<SetStateAction<string>>;
	draftFilter: DraftFilter;
	battingStatIds: string[];
	pitchingStatIds: string[];
};

const LeaderboardTable = memo(function LeaderboardTable({
	projectionGroups,
	activeGroupId,
	scoringSettings,
	leagueSettings,
	draftState,
	isDraftMode,
	mergeTwoWayRankings,
	toggleDraftedForTeam,
	toggleKeeperForTeam,
	activeTeamIndex,
	playerView,
	globalFilter,
	setGlobalFilter,
	draftFilter,
	battingStatIds,
	pitchingStatIds,
}: LeaderboardTableProps) {
	const activeGroup =
		projectionGroups.find((group) => group.id === activeGroupId) ??
		projectionGroups[0] ??
		null;
	const batters = activeGroup?.batters ?? [];
	const pitchers = activeGroup?.pitchers ?? [];
	const twoWayPlayers = activeGroup?.twoWayPlayers ?? [];

	const [sorting, setSorting] = useState<SortingState>([
		{ id: "projectedPoints", desc: true },
	]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 50,
	});

	const canMergeTwoWay =
		!!activeGroup &&
		activeGroup.batterIdSource !== null &&
		activeGroup.batterIdSource !== "generated" &&
		activeGroup.pitcherIdSource !== null &&
		activeGroup.pitcherIdSource !== "generated";

	const twoWayIds = useMemo(
		() => new Set(twoWayPlayers.map((player) => player._id)),
		[twoWayPlayers],
	);

	const useBaseballIp = useMemo(() => {
		const pitcherIps = [...pitchers, ...twoWayPlayers]
			.map((player) => {
				if (player._type === "two-way") {
					return player._pitchingStats.IP;
				}
				if (player._type === "pitcher") {
					return player.IP;
				}
				return null;
			})
			.filter((ip): ip is number => typeof ip === "number");

		if (pitcherIps.length === 0) return false;
		return pitcherIps.every((ip) => isValidBaseballIp(ip));
	}, [pitchers, twoWayPlayers]);

	// Memoize toggle handler to prevent column regeneration
	const handleToggleDrafted = useCallback(
		(playerId: string) => toggleDraftedForTeam(playerId, activeTeamIndex),
		[toggleDraftedForTeam, activeTeamIndex],
	);

	// Calculate points and create ranked players
	const rankedPlayers = useMemo(() => {
		let players: Player[] = [];
		const useMergedTwoWay =
			canMergeTwoWay && mergeTwoWayRankings && twoWayPlayers.length > 0;

		if (playerView === "all") {
			if (useMergedTwoWay) {
				players = [
					...batters.filter((player) => !twoWayIds.has(player._id)),
					...pitchers.filter((player) => !twoWayIds.has(player._id)),
					...twoWayPlayers,
				];
			} else if (
				batters.length === 0 &&
				pitchers.length === 0 &&
				twoWayPlayers.length > 0
			) {
				players = [...twoWayPlayers];
			} else {
				players = [...batters, ...pitchers];
			}
		} else if (playerView === "batters") {
			if (useMergedTwoWay) {
				players = [
					...batters.filter((player) => !twoWayIds.has(player._id)),
					...twoWayPlayers,
				];
			} else if (batters.length === 0 && twoWayPlayers.length > 0) {
				players = [...twoWayPlayers];
			} else {
				players = [...batters];
			}
		} else {
			if (useMergedTwoWay) {
				players = [
					...pitchers.filter((player) => !twoWayIds.has(player._id)),
					...twoWayPlayers,
				];
			} else if (pitchers.length === 0 && twoWayPlayers.length > 0) {
				players = [...twoWayPlayers];
			} else {
				players = [...pitchers];
			}
		}

		return players.map((player) => ({
			player,
			projectedPoints: calculatePlayerPoints(
				player,
				scoringSettings,
				playerView,
				useBaseballIp,
			),
			isDrafted: draftState.draftedByTeam[player._id] !== undefined,
			isKeeper: draftState.keeperByTeam[player._id] !== undefined,
			draftedTeamIndex:
				draftState.draftedByTeam[player._id] !== undefined
					? Number(draftState.draftedByTeam[player._id])
					: undefined,
			keeperTeamIndex:
				draftState.keeperByTeam[player._id] !== undefined
					? Number(draftState.keeperByTeam[player._id])
					: undefined,
		}));
	}, [
		batters,
		pitchers,
		twoWayPlayers,
		scoringSettings,
		draftState.draftedByTeam,
		draftState.keeperByTeam,
		playerView,
		canMergeTwoWay,
		mergeTwoWayRankings,
		twoWayIds,
		useBaseballIp,
	]);

	// Filter by draft status in draft mode
	const filteredPlayers = useMemo(() => {
		if (!isDraftMode || draftFilter === "all") return rankedPlayers;

		return rankedPlayers.filter((p) => {
			switch (draftFilter) {
				case "available":
					return !p.isDrafted && !p.isKeeper;
				case "drafted":
					return p.isDrafted;
				case "keepers":
					return p.isKeeper;
				default:
					return true;
			}
		});
	}, [rankedPlayers, isDraftMode, draftFilter]);

	const columns = useMemo<ColumnDef<RankedPlayer>[]>(() => {
		const resolveTeamLabel = (teamIndex?: number) => {
			if (teamIndex === undefined || Number.isNaN(teamIndex)) return null;
			return leagueSettings.teamNames[teamIndex] ?? `Team ${teamIndex + 1}`;
		};
		const baseColumns: ColumnDef<RankedPlayer>[] = [
			{
				id: "ADP",
				header: "ADP",
				size: 70,
				meta: { className: "text-right" },
				accessorFn: (row) =>
					(row.player as unknown as Record<string, number | null>).ADP,
				cell: ({ getValue }) => {
					const val = getValue() as number | null;
					return val ? Math.round(val) : "-";
				},
			},
			{
				accessorKey: "player.Name",
				header: "Name",
				size: 120,
				meta: { className: "max-w-[120px]" },
				cell: ({ row }) => (
					<div className="flex items-center gap-2 min-w-0">
						{isDraftMode && (
							<input
								type="checkbox"
								checked={row.original.isDrafted || row.original.isKeeper}
								onChange={() => handleToggleDrafted(row.original.player._id)}
								className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
								onClick={(e) => e.stopPropagation()}
							/>
						)}
						<span
							className={
								row.original.isDrafted
									? "text-slate-600 dark:text-slate-300 line-through truncate"
									: row.original.isKeeper
							? "font-semibold text-amber-800 dark:text-amber-200 truncate"
							: "truncate"
					}
					title={row.original.player.Name}
				>
					{row.original.player.Name}
				</span>
						{row.original.isDrafted && (
							<span className="rounded bg-emerald-100 dark:bg-emerald-950/40 px-1.5 text-xs text-emerald-800 dark:text-emerald-200">
								{resolveTeamLabel(row.original.draftedTeamIndex)}
							</span>
						)}
						{row.original.isKeeper && (
							<span className="rounded bg-amber-100 dark:bg-amber-950/40 px-1.5 text-xs text-amber-800 dark:text-amber-200">
								{resolveTeamLabel(row.original.keeperTeamIndex) ?? "K"}
							</span>
						)}
					</div>
				),
			},
			{
				accessorKey: "player.Team",
				header: "Team",
				size: 70,
			},
			{
				accessorKey: "player._type",
				header: "Type",
				size: 70,
				cell: ({ row }) => (
					<span
						className={`rounded px-1.5 py-0.5 text-xs font-medium ${
							row.original.player._type === "batter"
								? "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
								: row.original.player._type === "pitcher"
									? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200"
									: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
						}`}
					>
						{row.original.player._type === "batter"
							? "BAT"
							: row.original.player._type === "pitcher"
								? "PIT"
								: "2W"}
					</span>
				),
			},
			{
				id: "eligibility",
				header: "Pos",
				size: 150,
				accessorFn: (row) => formatEligibility(row.player),
				cell: ({ getValue }) => (
					<span className="text-xs text-slate-700 dark:text-slate-200">
						{getValue() as string}
					</span>
				),
			},
			{
				accessorKey: "projectedPoints",
				header: "Points",
				size: 95,
				cell: ({ row }) => (
					<span className="font-semibold text-emerald-700">
						{row.original.projectedPoints.toFixed(1)}
					</span>
				),
			},
		];

		const addBattingSeparator = playerView === "batters" || playerView === "all";
		const addPitchingSeparator = playerView === "all";
		const battingStatSet = new Set(battingStatIds);
		const pitchingStatSet = new Set(pitchingStatIds);

		const withLeadingSeparator = (
			columnDefs: ColumnDef<RankedPlayer>[],
			shouldAdd: boolean,
		) => {
			if (!shouldAdd || columnDefs.length === 0) return columnDefs;
			const [first, ...rest] = columnDefs;
			const existingClass =
				(first.meta as { className?: string } | undefined)?.className ?? "";
			const mergedClass = [existingClass, "border-l border-slate-200 dark:border-slate-800"]
				.filter(Boolean)
				.join(" ");
			const firstWithBorder: ColumnDef<RankedPlayer> = {
				...first,
				meta: { ...((first.meta ?? {}) as object), className: mergedClass },
			};
			return [firstWithBorder, ...rest];
		};

		// Add type-specific stat columns
		if (playerView === "batters" || playerView === "all") {
			const batterCols: ColumnDef<RankedPlayer>[] = [
				{
					id: "H",
					header: "H",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).H
							: row.player._type === "two-way"
								? row.player._battingStats.H
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "1B",
					header: "1B",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>)["1B"]
							: row.player._type === "two-way"
								? row.player._battingStats["1B"]
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "2B",
					header: "2B",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>)["2B"]
							: row.player._type === "two-way"
								? row.player._battingStats["2B"]
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "3B",
					header: "3B",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>)["3B"]
							: row.player._type === "two-way"
								? row.player._battingStats["3B"]
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "TB",
					header: "TB",
					size: 60,
					accessorFn: (row) => {
						const stats =
							row.player._type === "batter"
								? (row.player as unknown as Record<string, number>)
								: row.player._type === "two-way"
									? row.player._battingStats
									: null;
						if (!stats) return null;
						return (
							stats["1B"] +
							stats["2B"] * 2 +
							stats["3B"] * 3 +
							stats.HR * 4
						);
					},
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "HR",
					header: "HR",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).HR
							: row.player._type === "two-way"
								? row.player._battingStats.HR
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "R",
					header: "R",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).R
							: row.player._type === "two-way"
								? row.player._battingStats.R
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "RBI",
					header: "RBI",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).RBI
							: row.player._type === "two-way"
								? row.player._battingStats.RBI
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "BB",
					header: "BB",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).BB
							: row.player._type === "two-way"
								? row.player._battingStats.BB
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "HBP",
					header: "HBP",
					size: 70,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).HBP
							: row.player._type === "two-way"
								? row.player._battingStats.HBP
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "SO",
					header: "SO",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).SO
							: row.player._type === "two-way"
								? row.player._battingStats.SO
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "SB",
					header: "SB",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).SB
							: row.player._type === "two-way"
								? row.player._battingStats.SB
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "CS",
					header: "CS",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).CS
							: row.player._type === "two-way"
								? row.player._battingStats.CS
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "SF",
					header: "SF",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).SF
							: row.player._type === "two-way"
								? row.player._battingStats.SF
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "GDP",
					header: "GIDP",
					size: 70,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).GDP
							: row.player._type === "two-way"
								? row.player._battingStats.GDP
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "AVG",
					header: "AVG",
					size: 70,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).AVG
							: row.player._type === "two-way"
								? row.player._battingStats.AVG
								: null,
					cell: ({ getValue }) => {
						const val = getValue() as number | null;
						return val ? val.toFixed(3).replace(/^0/, "") : "-";
					},
				},
			];
			const visibleBatting = batterCols.filter((col) =>
				battingStatSet.has(col.id as string),
			);
			baseColumns.push(...withLeadingSeparator(visibleBatting, addBattingSeparator));
		}

		if (playerView === "pitchers" || playerView === "all") {
			const pitcherCols: ColumnDef<RankedPlayer>[] = [
				{
					id: "IP",
					header: "IP",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).IP
							: row.player._type === "two-way"
								? row.player._pitchingStats.IP
								: null,
					cell: ({ getValue }) => getValue() ?? "-",
				},
				{
					id: "SO_P",
					header: "K",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).SO
							: row.player._type === "two-way"
								? row.player._pitchingStats.SO
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "H_P",
					header: "H",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).H
							: row.player._type === "two-way"
								? row.player._pitchingStats.H
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "ER",
					header: "ER",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).ER
							: row.player._type === "two-way"
								? row.player._pitchingStats.ER
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "HR_P",
					header: "HR",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).HR
							: row.player._type === "two-way"
								? row.player._pitchingStats.HR
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "BB_P",
					header: "BB",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).BB
							: row.player._type === "two-way"
								? row.player._pitchingStats.BB
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "HBP_P",
					header: "HBP",
					size: 70,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).HBP
							: row.player._type === "two-way"
								? row.player._pitchingStats.HBP
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "W",
					header: "W",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).W
							: row.player._type === "two-way"
								? row.player._pitchingStats.W
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "L",
					header: "L",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).L
							: row.player._type === "two-way"
								? row.player._pitchingStats.L
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "QS",
					header: "QS",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? resolveQualityStarts(row.player, useBaseballIp)
							: row.player._type === "two-way"
								? resolveQualityStarts(row.player._pitchingStats, useBaseballIp)
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "SV",
					header: "SV",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).SV
							: row.player._type === "two-way"
								? row.player._pitchingStats.SV
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "HLD",
					header: "HLD",
					size: 70,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).HLD
							: row.player._type === "two-way"
								? row.player._pitchingStats.HLD
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "BS",
					header: "BS",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).BS
							: row.player._type === "two-way"
								? row.player._pitchingStats.BS
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "CG",
					header: "CG",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? resolveCompleteGames(row.player, useBaseballIp)
							: row.player._type === "two-way"
								? resolveCompleteGames(row.player._pitchingStats, useBaseballIp)
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "ShO",
					header: "ShO",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? resolveShutouts(row.player, useBaseballIp)
							: row.player._type === "two-way"
								? resolveShutouts(row.player._pitchingStats, useBaseballIp)
								: null,
					cell: ({ getValue }) =>
						formatCountingStat(getValue() as number | null),
				},
				{
					id: "ERA",
					header: "ERA",
					size: 70,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).ERA
							: row.player._type === "two-way"
								? row.player._pitchingStats.ERA
								: null,
					cell: ({ getValue }) => {
						const val = getValue() as number | null;
						return val ? val.toFixed(2) : "-";
					},
				},
				{
					id: "WHIP",
					header: "WHIP",
					size: 70,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).WHIP
							: row.player._type === "two-way"
								? row.player._pitchingStats.WHIP
								: null,
					cell: ({ getValue }) => {
						const val = getValue() as number | null;
						return val ? val.toFixed(2) : "-";
					},
				},
			];
			const visiblePitching = pitcherCols.filter((col) =>
				pitchingStatSet.has(col.id as string),
			);
			baseColumns.push(
				...withLeadingSeparator(visiblePitching, addPitchingSeparator),
			);
		}

		return baseColumns;
	}, [
		playerView,
		isDraftMode,
		handleToggleDrafted,
		useBaseballIp,
		leagueSettings,
		battingStatIds,
		pitchingStatIds,
	]);

	const table = useReactTable({
		data: filteredPlayers,
		columns,
		state: {
			sorting,
			globalFilter,
			pagination,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		globalFilterFn: (row, _, filterValue) => {
			const name = row.original.player.Name.toLowerCase();
			const team = row.original.player.Team.toLowerCase();
			const search = filterValue.toLowerCase();
			return name.includes(search) || team.includes(search);
		},
	});
	useEffect(() => {
		setPagination((current) =>
			current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
		);
	}, [globalFilter, draftFilter, playerView, activeGroupId]);

	const handleRowClick = useCallback(
		(player: RankedPlayer) => {
			if (!isDraftMode) return;
			handleToggleDrafted(player.player._id);
		},
		[isDraftMode, handleToggleDrafted],
	);

	const handleRowContextMenu = (e: React.MouseEvent, player: RankedPlayer) => {
		if (!isDraftMode) return;
		e.preventDefault();
		toggleKeeperForTeam(player.player._id, activeTeamIndex);
	};

	if (
		!activeGroup ||
		(batters.length === 0 &&
			pitchers.length === 0 &&
			twoWayPlayers.length === 0)
	) {
		return (
			<div className="flex h-96 flex-col items-center justify-center text-slate-500 dark:text-slate-400">
				<p className="mb-2 text-lg">No players loaded</p>
				<p className="text-sm">Upload a CSV file to get started</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
				<table className="w-full text-sm text-slate-800 dark:text-slate-100">
					<thead className="bg-slate-100 dark:bg-slate-800/70">
								{table.getHeaderGroups().map((headerGroup) => (
									<tr key={headerGroup.id}>
										{headerGroup.headers.map((header) => (
										<th
											key={header.id}
											style={{ width: header.getSize() }}
											className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200 whitespace-nowrap ${
												header.column.getCanSort()
													? "cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100"
													: ""
											} ${
													(
														header.column.columnDef.meta as
															| { className?: string }
															| undefined
													)?.className ?? ""
												}`}
											onClick={header.column.getToggleSortingHandler()}
										>
											<div className="flex items-center gap-1 whitespace-nowrap">
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
											{{
												asc: " ↑",
												desc: " ↓",
											}[header.column.getIsSorted() as string] ?? null}
										</div>
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows.map((row, index) => (
							<tr
								key={row.id}
								onClick={() => handleRowClick(row.original)}
								onContextMenu={(e) => handleRowContextMenu(e, row.original)}
								className={`border-t border-slate-200 dark:border-slate-800 ${
									isDraftMode ? "cursor-pointer" : ""
								} ${
									row.original.isDrafted
										? "bg-slate-100 dark:bg-slate-800/70"
										: row.original.isKeeper
											? "bg-amber-100/60 dark:bg-amber-950/30"
											: index % 2 === 0
												? "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
												: "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
								}`}
							>
								{row.getVisibleCells().map((cell) => (
									<td
										key={cell.id}
										className={`px-3 py-2 ${
											(
												cell.column.columnDef.meta as
													| { className?: string }
													| undefined
											)?.className ?? ""
										}`}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 shadow-sm">
				<div className="flex items-center gap-2">
					<button
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Prev
					</button>
					<button
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Next
					</button>
					<span className="text-slate-600 dark:text-slate-300">
						Page {pagination.pageIndex + 1} of{" "}
						{Math.max(1, table.getPageCount())}
					</span>
				</div>
				<div className="flex items-center gap-3">
					<span className="text-slate-500 dark:text-slate-400">
						{table.getPrePaginationRowModel().rows.length} total
					</span>
					<label className="flex items-center gap-2">
						<span className="text-slate-500 dark:text-slate-400">Rows</span>
						<select
							value={pagination.pageSize}
							onChange={(e) => {
								const nextSize = Number(e.target.value);
								setPagination({ pageIndex: 0, pageSize: nextSize });
							}}
							className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40"
						>
							<option value={25}>25</option>
							<option value={50}>50</option>
							<option value={100}>100</option>
						</select>
					</label>
				</div>
			</div>
		</div>
	);
});
