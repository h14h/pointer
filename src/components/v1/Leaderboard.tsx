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
		<div className="flex flex-col font-mono">
			{/* Filters */}
			<div className="mb-3 border border-gray-300 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] p-2">
				<div className="flex flex-wrap items-center gap-2">
					<input
						type="text"
						placeholder="Search players..."
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
						aria-label="Search players"
						className="w-full min-w-[200px] flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-2 py-1 text-[11px] text-[#1a1a1a] dark:text-[#e0e0e0] placeholder:text-gray-400 dark:placeholder:text-gray-600 font-mono focus:border-[#00ff88] focus:outline-none"
					/>

					<select
						value={playerView}
						onChange={(e) => setPlayerView(e.target.value as PlayerView)}
						aria-label="Player type"
						className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-2 py-1 text-[11px] text-[#1a1a1a] dark:text-[#e0e0e0] font-mono focus:border-[#00ff88] focus:outline-none"
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
								aria-label="Projection group"
								className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-2 py-1 text-[11px] text-[#1a1a1a] dark:text-[#e0e0e0] font-mono focus:border-[#00ff88] focus:outline-none"
							>
								{projectionGroups.map((group) => (
									<option key={group.id} value={group.id}>
										{group.name}
									</option>
								))}
							</select>
							{isSwitchingGroups && (
								<span
									className="h-3 w-3 animate-spin border border-gray-600 border-t-[#00ff88]"
									aria-label="Loading projections"
								/>
							)}
						</div>
					)}

					{isDraftMode && (
						<select
							value={draftFilter}
							onChange={(e) => setDraftFilter(e.target.value as DraftFilter)}
							aria-label="Draft status"
							className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-2 py-1 text-[11px] text-[#1a1a1a] dark:text-[#e0e0e0] font-mono focus:border-[#00ff88] focus:outline-none"
						>
							<option value="available">Available</option>
							<option value="all">All</option>
							<option value="drafted">Drafted</option>
							<option value="keepers">Keepers</option>
						</select>
					)}

					{isDraftMode && (
						<span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-600 font-mono">
							Click to draft, right-click for keeper
						</span>
					)}

					<button
						onClick={() => setIsStatsOpen((open) => !open)}
						className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a] dark:text-gray-400 hover:border-[#00ff88] hover:text-[#00ff88] transition-colors font-mono"
						aria-expanded={isStatsOpen}
						aria-controls="stat-visibility-panel"
					>
						{isStatsOpen ? "Hide Stats" : "Customize Stats"}
					</button>
				</div>
			</div>

			{/* Stat Visibility Panel */}
			{isStatsOpen && (
				<div
					id="stat-visibility-panel"
					className="border border-gray-300 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] p-3"
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a] dark:text-white font-mono">
								Visible Stats
							</p>
							<p className="text-[10px] text-gray-500 dark:text-gray-600 font-mono">
								Toggle columns without changing scoring.
							</p>
						</div>
						<button
							onClick={() => setIsStatsOpen(false)}
							className="border border-gray-300 dark:border-gray-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-[#1a1a1a] dark:hover:text-white hover:border-gray-500 transition-colors font-mono"
						>
							Close
						</button>
					</div>
					<div className="mt-3 grid gap-3 lg:grid-cols-2">
						{/* Batting stats */}
						<div className="border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111] p-3">
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-500 font-mono">
									Batting
								</span>
								<div className="flex items-center gap-2">
									<button
										onClick={() => applyAllStats("batting")}
										className="text-[10px] font-bold uppercase tracking-wider text-[#00ff88] hover:text-[#00ff88]/80"
									>
										All
									</button>
									<button
										onClick={() => clearAllStats("batting")}
										className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-300"
									>
										None
									</button>
								</div>
							</div>
							<div className="mt-2 flex flex-wrap gap-1.5">
								{BATTING_STAT_OPTIONS.map((stat) => (
									<label
										key={stat.id}
										className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-2 py-1 text-[10px] font-bold text-[#1a1a1a] dark:text-gray-400 font-mono"
									>
										<input
											type="checkbox"
											checked={battingStatSet.has(stat.id)}
											onChange={(event) =>
												toggleStat("batting", stat.id, event.target.checked)
											}
											className="h-3 w-3 border-gray-400 dark:border-gray-600 text-[#00ff88] accent-[#00ff88]"
										/>
										<span>{stat.label}</span>
									</label>
								))}
							</div>
						</div>
						{/* Pitching stats */}
						<div className="border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111] p-3">
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-500 font-mono">
									Pitching
								</span>
								<div className="flex items-center gap-2">
									<button
										onClick={() => applyAllStats("pitching")}
										className="text-[10px] font-bold uppercase tracking-wider text-[#00ff88] hover:text-[#00ff88]/80"
									>
										All
									</button>
									<button
										onClick={() => clearAllStats("pitching")}
										className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-300"
									>
										None
									</button>
								</div>
							</div>
							<div className="mt-2 flex flex-wrap gap-1.5">
								{PITCHING_STAT_OPTIONS.map((stat) => (
									<label
										key={stat.id}
										className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-2 py-1 text-[10px] font-bold text-[#1a1a1a] dark:text-gray-400 font-mono"
									>
										<input
											type="checkbox"
											checked={pitchingStatSet.has(stat.id)}
											onChange={(event) =>
												toggleStat("pitching", stat.id, event.target.checked)
											}
											className="h-3 w-3 border-gray-400 dark:border-gray-600 text-[#00ff88] accent-[#00ff88]"
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
					<div className="pointer-events-none absolute inset-0 bg-black/20 dark:bg-black/30" />
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

	const handleToggleDrafted = useCallback(
		(playerId: string) => toggleDraftedForTeam(playerId, activeTeamIndex),
		[toggleDraftedForTeam, activeTeamIndex],
	);

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
					<div className="flex items-center gap-1.5 min-w-0">
						{isDraftMode && (
							<input
								type="checkbox"
								checked={row.original.isDrafted || row.original.isKeeper}
								onChange={() => handleToggleDrafted(row.original.player._id)}
								aria-label={`Draft ${row.original.player.Name}`}
								className="h-3 w-3 border-gray-400 dark:border-gray-600 accent-[#00ff88]"
								onClick={(e) => e.stopPropagation()}
							/>
						)}
						<span
							className={
								row.original.isDrafted
									? "text-gray-500 dark:text-gray-600 line-through truncate"
									: row.original.isKeeper
							? "font-bold text-amber-600 dark:text-amber-400 truncate"
							: "truncate"
					}
					title={row.original.player.Name}
				>
					{row.original.player.Name}
				</span>
						{row.original.isDrafted && (
							<span className="bg-[#00ff88]/10 border border-[#00ff88]/30 px-1 text-[9px] text-[#00ff88] font-mono">
								{resolveTeamLabel(row.original.draftedTeamIndex)}
							</span>
						)}
						{row.original.isKeeper && (
							<span className="bg-amber-500/10 border border-amber-500/30 px-1 text-[9px] text-amber-500 font-mono">
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
						className={`px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono ${
							row.original.player._type === "batter"
								? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
								: row.original.player._type === "pitcher"
									? "bg-violet-500/10 text-violet-400 border border-violet-500/30"
									: "bg-amber-500/10 text-amber-400 border border-amber-500/30"
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
					<span className="text-[10px] text-[#1a1a1a] dark:text-gray-400 font-mono">
						{getValue() as string}
					</span>
				),
			},
			{
				accessorKey: "projectedPoints",
				header: "Points",
				size: 95,
				cell: ({ row }) => (
					<span className="font-bold text-[#00ff88] font-mono text-[11px] [text-shadow:0_0_8px_rgba(0,255,136,0.4)]">
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
			const mergedClass = [existingClass, "border-l border-gray-200 dark:border-gray-800"]
				.filter(Boolean)
				.join(" ");
			const firstWithBorder: ColumnDef<RankedPlayer> = {
				...first,
				meta: { ...((first.meta ?? {}) as object), className: mergedClass },
			};
			return [firstWithBorder, ...rest];
		};

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
			<div className="flex h-96 flex-col items-center justify-center text-gray-500 dark:text-gray-600 font-mono">
				<p className="mb-2 text-xs uppercase tracking-wider">No players loaded</p>
				<p className="text-[10px] text-gray-400 dark:text-gray-700">Upload a CSV file to get started</p>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="overflow-x-auto border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a0a]">
				<table className="w-full text-[11px] text-[#1a1a1a] dark:text-[#e0e0e0] font-mono">
					<thead className="bg-[#111111] dark:bg-[#111111] text-gray-400">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										style={{ width: header.getSize() }}
										className={`px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-500 whitespace-nowrap ${
											header.column.getCanSort()
												? "cursor-pointer select-none hover:text-[#00ff88]"
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
								className={`border-t border-gray-200 dark:border-gray-800/50 ${
									isDraftMode ? "cursor-pointer" : ""
								} ${
									row.original.isDrafted
										? "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-600"
										: row.original.isKeeper
											? "bg-amber-50 dark:bg-amber-950/10"
											: index % 2 === 0
												? "bg-white dark:bg-[#0a0a0a] hover:bg-gray-50 dark:hover:bg-[#111]"
												: "bg-gray-50/50 dark:bg-[#0e0e0e] hover:bg-gray-50 dark:hover:bg-[#111]"
								}`}
							>
								{row.getVisibleCells().map((cell) => (
									<td
										key={cell.id}
										className={`px-2 py-1 ${
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

			{/* Pagination */}
			<div className="flex flex-wrap items-center justify-between gap-2 border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] px-2 py-1.5 text-[10px] text-gray-500 dark:text-gray-500 font-mono">
				<div className="flex items-center gap-2">
					<button
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a] dark:text-gray-400 hover:border-[#00ff88] hover:text-[#00ff88] disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
					>
						Prev
					</button>
					<button
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a] dark:text-gray-400 hover:border-[#00ff88] hover:text-[#00ff88] disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
					>
						Next
					</button>
					<span className="text-gray-500">
						Page {pagination.pageIndex + 1} of{" "}
						{Math.max(1, table.getPageCount())}
					</span>
				</div>
				<div className="flex items-center gap-3">
					<span className="text-gray-600">
						{table.getPrePaginationRowModel().rows.length} total
					</span>
					<label className="flex items-center gap-2">
						<span className="text-gray-600">Rows</span>
						<select
							value={pagination.pageSize}
							onChange={(e) => {
								const nextSize = Number(e.target.value);
								setPagination({ pageIndex: 0, pageSize: nextSize });
							}}
							aria-label="Rows per page"
							className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-1.5 py-0.5 text-[10px] text-[#1a1a1a] dark:text-gray-400 font-mono focus:border-[#00ff88] focus:outline-none"
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
