"use client";

import {
	useMemo,
	useState,
	useCallback,
	useDeferredValue,
	useEffect,
	memo,
	startTransition,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
} from "react";
import {
	type SortingState,
	type ColumnDef,
} from "@tanstack/react-table";
import { MenuSelect } from "@/components/ui/MenuSelect";
import { useStore } from "@/store";
import { POSITION_ORDER } from "@/lib/eligibility";
import { useDebouncedCallback } from "@/lib/useDebounce";
import {
	buildBaseRankedPlayers,
	buildFilterMetadata,
	filterRankedPlayers,
	formatEligibilityForLeaderboard,
	sortLeaderboardRows,
	type DraftFilter,
	type LeaderboardRow,
	type PlayerView,
} from "@/lib/leaderboardDerived";
import type {
	RankedPlayer,
	DraftState,
	ScoringSettings,
	ProjectionGroup,
	LeagueSettings,
} from "@/types";
import { useShallow } from "zustand/react/shallow";

const POSITION_FILTER_OPTIONS: string[] = [...POSITION_ORDER, "SP", "RP"];
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
	value === null || Number.isNaN(value) ? (
		"-"
	) : (
		<span className="font-mono">{Math.round(value)}</span>
	);

function abbreviateName(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].toUpperCase();
	const firstName = parts[0];
	const remaining = parts.slice(1).join(" ");
	return `${firstName[0].toUpperCase()}. ${remaining}`;
}

function getAccessorValue<TData>(row: TData, column: ColumnDef<TData>): unknown {
	if ("accessorFn" in column && typeof column.accessorFn === "function") {
		return column.accessorFn(row, 0);
	}
	if ("accessorKey" in column && typeof column.accessorKey === "string") {
		return column.accessorKey
			.split(".")
			.reduce<unknown>((value, key) => {
				if (value && typeof value === "object" && key in value) {
					return (value as Record<string, unknown>)[key];
				}
				return undefined;
			}, row);
	}
	return undefined;
}

function renderColumnHeader<TData>(column: ColumnDef<TData>): ReactNode {
	return typeof column.header === "function"
		? column.header({} as never)
		: column.header ?? null;
}

function renderColumnCell<TData>(column: ColumnDef<TData>, row: TData): ReactNode {
	const value = getAccessorValue(row, column);
	if (typeof column.cell === "function") {
		return column.cell({
			getValue: () => value,
			row: { original: row },
			column: { columnDef: column },
			cell: { getValue: () => value },
			table: {},
			renderValue: () => value,
			getContext: () => ({}),
		} as never);
	}
	return value as ReactNode;
}

function getColumnId<TData>(column: ColumnDef<TData>, fallbackIndex: number): string {
	if ("id" in column && typeof column.id === "string") {
		return column.id;
	}
	if ("accessorKey" in column && typeof column.accessorKey === "string") {
		return column.accessorKey;
	}
	return `column-${fallbackIndex}`;
}

function getNextSorting(columnId: string, currentSorting: SortingState): SortingState {
	const current = currentSorting[0];
	if (!current || current.id !== columnId) {
		return [{ id: columnId, desc: false }];
	}
	return [{ id: columnId, desc: !current.desc }];
}

function PlayerViewFilter({
	value,
	onChange,
}: {
	value: PlayerView;
	onChange: (nextValue: PlayerView) => void;
}) {
	return (
		<MenuSelect
			value={value}
			onChange={onChange}
			ariaLabel="Player type"
			options={[
				{ value: "all", label: "All Players" },
				{ value: "batters", label: "Batters" },
				{ value: "pitchers", label: "Pitchers" },
			]}
		/>
	);
}

function PositionFilter({
	selectedPositions,
	onChange,
}: {
	selectedPositions: Set<string>;
	onChange: Dispatch<SetStateAction<Set<string>>>;
}) {
	return (
		<MenuSelect
			mode="multi"
			values={Array.from(selectedPositions)}
			onChange={(nextValues) => onChange(new Set(nextValues))}
			ariaLabel="Position"
			triggerLabel="Position"
			menuLabel="Filter by Position"
			clearLabel="Clear"
			menuClassName="min-w-[200px]"
			options={POSITION_FILTER_OPTIONS.map((pos) => ({ value: pos, label: pos }))}
		/>
	);
}

export function Leaderboard() {
	const {
		projectionGroups,
		activeProjectionGroupId,
		setActiveProjectionGroup,
		isDraftMode,
		toggleDraftedForTeam,
		toggleKeeperForTeam,
		mergeTwoWayRankings,
		leagues,
		activeLeagueId,
	} = useStore(
		useShallow((state) => ({
			projectionGroups: state.projectionGroups,
			activeProjectionGroupId: state.activeProjectionGroupId,
			setActiveProjectionGroup: state.setActiveProjectionGroup,
			isDraftMode: state.isDraftMode,
			toggleDraftedForTeam: state.toggleDraftedForTeam,
			toggleKeeperForTeam: state.toggleKeeperForTeam,
			mergeTwoWayRankings: state.mergeTwoWayRankings,
			leagues: state.leagues,
			activeLeagueId: state.activeLeagueId,
		})),
	);
	const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
	const scoringSettings = activeLeague?.scoringSettings;
	const leagueSettings = activeLeague?.leagueSettings;
	const draftState = activeLeague?.draftState;
	const currentGroupId =
		activeProjectionGroupId ?? projectionGroups[0]?.id ?? null;
	const deferredGroupId = useDeferredValue(currentGroupId);
	const isSwitchingGroups = deferredGroupId !== currentGroupId;
	const [globalFilter, setGlobalFilter] = useState("");
	const [appliedGlobalFilter, setAppliedGlobalFilter] = useState("");
	const [playerView, setPlayerView] = useState<PlayerView>("all");
	const [draftFilter, setDraftFilter] = useState<DraftFilter>("available");
	const [isStatsOpen, setIsStatsOpen] = useState(false);
	const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
	const [appliedSelectedPositions, setAppliedSelectedPositions] = useState<Set<string>>(
		new Set(),
	);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 25,
	});
	const deferredPlayerView = useDeferredValue(playerView);
	const selectedPositionsKey = Array.from(selectedPositions).sort().join("|");
	const appliedSelectedPositionsKey = Array.from(appliedSelectedPositions)
		.sort()
		.join("|");
	const isApplyingFilters =
		appliedGlobalFilter !== globalFilter ||
		deferredPlayerView !== playerView ||
		appliedSelectedPositionsKey !== selectedPositionsKey;

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

	const [selectedBattingStats, setSelectedBattingStats] = useState<string[]>(
		() =>
			parseStored(STORAGE_KEYS.batting, DEFAULT_BATTING_STATS).filter(
				(statId) => battingOptions.has(statId),
			),
	);
	const [selectedPitchingStats, setSelectedPitchingStats] = useState<string[]>(
		() =>
			parseStored(STORAGE_KEYS.pitching, DEFAULT_PITCHING_STATS).filter(
				(statId) => pitchingOptions.has(statId),
			),
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
	const resetPagination = useCallback(() => {
		setPagination((current) =>
			current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
		);
	}, []);
	const applySearchFilter = useDebouncedCallback((nextValue: string) => {
		startTransition(() => {
			resetPagination();
			setAppliedGlobalFilter(nextValue);
		});
	}, 120);
	const applyPositionFilter = useDebouncedCallback((nextValues: string[]) => {
		startTransition(() => {
			resetPagination();
			setAppliedSelectedPositions(new Set(nextValues));
		});
	}, 120);
	const tableNode = (
		<div className="relative">
			{(isSwitchingGroups || isApplyingFilters) && (
				<div className="pointer-events-none absolute inset-0 z-[2] bg-white/50 dark:bg-[#111111]/50" />
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
				playerView={deferredPlayerView}
				globalFilter={appliedGlobalFilter}
				draftFilter={draftFilter}
				battingStatIds={selectedBattingStats}
				pitchingStatIds={selectedPitchingStats}
				selectedPositions={appliedSelectedPositions}
				pagination={pagination}
				setPagination={setPagination}
			/>
		</div>
	);

	return (
		<div className="flex flex-col font-sans">
			{/* Filters */}
			<div className="mb-6 border-b border-[#111111]/10 dark:border-[#333333] pb-5">
				<div className="flex flex-wrap items-center gap-3">
					<input
						type="text"
						placeholder="Search players..."
						value={globalFilter}
						onChange={(e) => {
							const nextValue = e.target.value;
							setGlobalFilter(nextValue);
							applySearchFilter(nextValue);
						}}
						className="w-full min-w-[220px] flex-1 rounded-sm border border-[#111111]/20 dark:border-[#333333] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-sm text-[#111111] dark:text-[#e5e5e5] placeholder:text-[#111111]/30 dark:placeholder:text-[#e5e5e5]/30 focus:border-[#dc2626] dark:focus:border-[#ef4444] focus:outline-none"
					/>

					<PlayerViewFilter
						value={playerView}
						onChange={(nextValue) => {
							startTransition(() => {
								resetPagination();
								setPlayerView(nextValue);
							});
						}}
					/>

					{projectionGroups.length > 1 && (
						<div className="flex items-center gap-2">
							<MenuSelect
								value={currentGroupId ?? ""}
								onChange={(nextGroupId) => {
									startTransition(() => {
										resetPagination();
										setActiveProjectionGroup(nextGroupId);
									});
								}}
								ariaLabel="Projection group"
								options={projectionGroups.map((group) => ({
									value: group.id,
									label: group.name,
								}))}
							/>
							{isSwitchingGroups && (
								<span
									className="h-4 w-4 animate-spin rounded-full border-2 border-[#111111]/20 dark:border-[#333333] border-t-[#dc2626] dark:border-t-[#ef4444]"
									aria-label="Loading projections"
								/>
							)}
						</div>
					)}

					{isDraftMode && (
						<MenuSelect
							value={draftFilter}
							onChange={(nextValue) => {
								startTransition(() => {
									resetPagination();
									setDraftFilter(nextValue);
								});
							}}
							ariaLabel="Draft filter"
							options={[
								{ value: "available", label: "Available" },
								{ value: "all", label: "All" },
								{ value: "drafted", label: "Drafted" },
								{ value: "keepers", label: "Keepers" },
							]}
						/>
					)}

					<PositionFilter
						selectedPositions={selectedPositions}
						onChange={(nextValue) => {
							const resolvedNextValues =
								typeof nextValue === "function"
									? nextValue(selectedPositions)
									: nextValue;
							setSelectedPositions(resolvedNextValues);
							applyPositionFilter(Array.from(resolvedNextValues));
						}}
					/>

					{isDraftMode && (
						<span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/40 dark:text-[#e5e5e5]/30">
							Click to draft, right-click for keeper
						</span>
					)}

					<button
						onClick={() => setIsStatsOpen((open) => !open)}
						className="relative inline-flex min-h-8 items-center justify-center rounded-sm border border-[#111111]/30 px-3 py-1.5 text-center text-xs font-bold uppercase tracking-widest text-[#111111]/70 transition-colors hover:bg-[#f5f5f5] dark:border-[#333333] dark:text-[#e5e5e5]/60 dark:hover:bg-[#1a1a1a]"
						aria-expanded={isStatsOpen}
						aria-controls="stat-visibility-panel"
					>
						<span className="invisible">Customize Stats</span>
						<span className="absolute inset-0 flex items-center justify-center">
							{isStatsOpen ? "Hide Stats" : "Customize Stats"}
						</span>
					</button>
				</div>
			</div>

			{isStatsOpen && (
				<div
					id="stat-visibility-panel"
					className="mb-6 border-b border-[#111111]/10 dark:border-[#333333] pb-5"
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="text-sm font-bold text-[#111111] dark:text-[#e5e5e5]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
								Visible Stats
							</p>
							<p className="text-xs text-[#111111]/50 dark:text-[#e5e5e5]/40">
								Toggle columns without changing scoring.
							</p>
						</div>
						<button
							onClick={() => setIsStatsOpen(false)}
							className="text-xs font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40 hover:text-[#111111] dark:hover:text-[#e5e5e5]"
						>
							Close
						</button>
					</div>
					<div className="mt-4 grid gap-6 lg:grid-cols-2">
						<div>
							<div className="flex items-center justify-between mb-3">
								<span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
									Batting
								</span>
								<div className="flex items-center gap-3">
									<button
										onClick={() => applyAllStats("batting")}
										className="text-xs font-bold uppercase tracking-widest text-[#dc2626] dark:text-[#ef4444] hover:underline"
									>
										All
									</button>
									<button
										onClick={() => clearAllStats("batting")}
										className="text-xs font-bold uppercase tracking-widest text-[#111111]/40 dark:text-[#e5e5e5]/30 hover:text-[#111111] dark:hover:text-[#e5e5e5]"
									>
										None
									</button>
								</div>
							</div>
							<div className="flex flex-wrap gap-2">
								{BATTING_STAT_OPTIONS.map((stat) => (
									<label
										key={stat.id}
										className="flex items-center gap-1.5 border border-[#111111]/10 dark:border-[#333333] bg-white dark:bg-[#1a1a1a] px-2.5 py-1.5 text-xs font-medium text-[#111111] dark:text-[#e5e5e5] rounded-sm"
									>
										<input
											type="checkbox"
											checked={battingStatSet.has(stat.id)}
											onChange={(event) =>
												toggleStat("batting", stat.id, event.target.checked)
											}
											className="h-3.5 w-3.5 rounded-sm border-[#111111]/30 dark:border-[#333333] text-[#dc2626] dark:text-[#ef4444] accent-[#dc2626] dark:accent-[#ef4444]"
										/>
										<span>{stat.label}</span>
									</label>
								))}
							</div>
						</div>
						<div>
							<div className="flex items-center justify-between mb-3">
								<span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
									Pitching
								</span>
								<div className="flex items-center gap-3">
									<button
										onClick={() => applyAllStats("pitching")}
										className="text-xs font-bold uppercase tracking-widest text-[#dc2626] dark:text-[#ef4444] hover:underline"
									>
										All
									</button>
									<button
										onClick={() => clearAllStats("pitching")}
										className="text-xs font-bold uppercase tracking-widest text-[#111111]/40 dark:text-[#e5e5e5]/30 hover:text-[#111111] dark:hover:text-[#e5e5e5]"
									>
										None
									</button>
								</div>
							</div>
							<div className="flex flex-wrap gap-2">
								{PITCHING_STAT_OPTIONS.map((stat) => (
									<label
										key={stat.id}
										className="flex items-center gap-1.5 border border-[#111111]/10 dark:border-[#333333] bg-white dark:bg-[#1a1a1a] px-2.5 py-1.5 text-xs font-medium text-[#111111] dark:text-[#e5e5e5] rounded-sm"
									>
										<input
											type="checkbox"
											checked={pitchingStatSet.has(stat.id)}
											onChange={(event) =>
												toggleStat("pitching", stat.id, event.target.checked)
											}
											className="h-3.5 w-3.5 rounded-sm border-[#111111]/30 dark:border-[#333333] text-[#dc2626] dark:text-[#ef4444] accent-[#dc2626] dark:accent-[#ef4444]"
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
			{tableNode}
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
	draftFilter: DraftFilter;
	battingStatIds: string[];
	pitchingStatIds: string[];
	selectedPositions: Set<string>;
	pagination: { pageIndex: number; pageSize: number };
	setPagination: Dispatch<
		SetStateAction<{ pageIndex: number; pageSize: number }>
	>;
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
	draftFilter,
	battingStatIds,
	pitchingStatIds,
	selectedPositions,
	pagination,
	setPagination,
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
	// Memoize toggle handler to prevent column regeneration
	const handleToggleDrafted = useCallback(
		(playerId: string) => toggleDraftedForTeam(playerId, activeTeamIndex),
		[toggleDraftedForTeam, activeTeamIndex],
	);

	const rankedPlayers = useMemo(
		() =>
			buildBaseRankedPlayers({
				activeGroup,
				playerView,
				scoringSettings,
				leagueSettings,
				draftState,
				mergeTwoWayRankings,
			}),
		[
			activeGroup,
			playerView,
			scoringSettings,
			leagueSettings,
			draftState,
			mergeTwoWayRankings,
		],
	);

	const rankedPlayersWithMetadata = useMemo(
		() => buildFilterMetadata(rankedPlayers),
		[rankedPlayers],
	);

	const filteredPlayers = useMemo(
		() =>
			filterRankedPlayers({
				rows: rankedPlayersWithMetadata,
				selectedPositions,
				isDraftMode,
				draftFilter,
				search: "",
			}),
		[rankedPlayersWithMetadata, selectedPositions, isDraftMode, draftFilter],
	);

	const sortedPlayers = useMemo(
		() => sortLeaderboardRows(filteredPlayers, sorting),
		[filteredPlayers, sorting],
	);

	const rankByPlayerId = useMemo(
		() =>
			new Map(
				sortedPlayers.map((row, index) => [row.player._id, index + 1]),
			),
		[sortedPlayers],
	);

	const searchedPlayers = useMemo(
		() =>
			filterRankedPlayers({
				rows: sortedPlayers,
				selectedPositions: new Set<string>(),
				isDraftMode: false,
				draftFilter: "all",
				search: globalFilter,
			}),
		[sortedPlayers, globalFilter],
	);

	const columns = useMemo<ColumnDef<LeaderboardRow>[]>(() => {
		const resolveTeamLabel = (teamIndex?: number) => {
			if (teamIndex === undefined || Number.isNaN(teamIndex)) return null;
			return leagueSettings.teamNames[teamIndex] ?? `Team ${teamIndex + 1}`;
		};
		const baseColumns: ColumnDef<LeaderboardRow>[] = [
			{
				id: "ADP",
				header: "ADP",
				size: 70,
				accessorFn: (row) =>
					(row.player as unknown as Record<string, number | null>).ADP,
				cell: ({ getValue }) => {
					const val = getValue() as number | null;
					return (
						<span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 dark:text-[#e5e5e5]/50">
							{val != null ? val.toFixed(1) : "-"}
						</span>
					);
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
								className="h-3.5 w-3.5 rounded-sm border-[#111111]/30 dark:border-[#333333] accent-[#dc2626] dark:accent-[#ef4444]"
								onClick={(e) => e.stopPropagation()}
							/>
						)}
						<span
							className={
								row.original.isDrafted
									? "text-[10px] font-bold uppercase tracking-widest text-[#111111]/40 dark:text-[#e5e5e5]/30 line-through truncate"
									: row.original.isKeeper
							? "text-[10px] font-bold uppercase tracking-widest text-[#111111] dark:text-[#e5e5e5] truncate"
							: "text-[10px] font-bold uppercase tracking-widest truncate"
					}
					title={row.original.player.Name}
				>
					{abbreviateName(row.original.player.Name)}
				</span>
						{row.original.isDrafted && (
							<span className="border border-[#111111]/20 dark:border-[#333333] px-1.5 text-[10px] font-bold uppercase tracking-wider text-[#111111]/60 dark:text-[#e5e5e5]/50 rounded-sm">
								{resolveTeamLabel(row.original.draftedTeamIndex)}
							</span>
						)}
						{row.original.isKeeper && (
							<span className="border border-[#dc2626]/30 dark:border-[#ef4444]/30 bg-[#dc2626]/5 dark:bg-[#ef4444]/5 px-1.5 text-[10px] font-bold uppercase tracking-wider text-[#dc2626] dark:text-[#ef4444] rounded-sm">
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
				cell: ({ getValue }) => (
					<span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 dark:text-[#e5e5e5]/50">
						{getValue() as string}
					</span>
				),
			},
			{
				accessorKey: "player._type",
				header: "Type",
				size: 70,
				cell: ({ row }) => (
					<span
						className={`text-[10px] font-bold uppercase tracking-widest ${
							row.original.player._type === "batter"
								? "text-[#111111]/60 dark:text-[#e5e5e5]/50"
								: row.original.player._type === "pitcher"
									? "text-[#111111]/60 dark:text-[#e5e5e5]/50"
									: "text-[#dc2626] dark:text-[#ef4444]"
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
				accessorFn: (row) => formatEligibilityForLeaderboard(row.player),
				cell: ({ getValue }) => (
					<span
						className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 dark:text-[#e5e5e5]/50"
						title={getValue() as string}
					>
						{getValue() as string}
					</span>
				),
			},
			{
				accessorKey: "projectedPoints",
				header: "Points",
				size: 95,
				cell: ({ row }) => (
					<span className="font-bold font-mono text-[#dc2626] dark:text-[#ef4444]">
						{Math.round(row.original.projectedPoints)}
					</span>
				),
			},
			{
				accessorKey: "par",
				header: "PAR",
				size: 80,
				cell: ({ row }) => {
					const val = Math.round(row.original.par);
					const formatted = val >= 0 ? `+${val}` : `${val}`;
					return (
						<span
							className={`font-mono text-xs ${
								val > 0
									? "text-green-600 dark:text-green-400"
									: val < 0
										? "text-red-600 dark:text-red-400"
										: "text-[#111111]/40 dark:text-[#e5e5e5]/40"
							}`}
						>
							{formatted}
						</span>
					);
				},
			},
		];

		const addBattingSeparator = playerView === "batters" || playerView === "all";
		const addPitchingSeparator = playerView === "all";
		const battingStatSet = new Set(battingStatIds);
		const pitchingStatSet = new Set(pitchingStatIds);

		const withLeadingSeparator = (
			columnDefs: ColumnDef<LeaderboardRow>[],
			shouldAdd: boolean,
		) => {
			if (!shouldAdd || columnDefs.length === 0) return columnDefs;
			const [first, ...rest] = columnDefs;
			const existingClass =
				(first.meta as { className?: string } | undefined)?.className ?? "";
			const mergedClass = [existingClass, "border-l border-[#111111]/10 dark:border-[#333333]"]
				.filter(Boolean)
				.join(" ");
			const firstWithBorder: ColumnDef<LeaderboardRow> = {
				...first,
				meta: { ...((first.meta ?? {}) as object), className: mergedClass },
			};
			return [firstWithBorder, ...rest];
		};

		// Add type-specific stat columns
		if (playerView === "batters" || playerView === "all") {
			const batterCols: ColumnDef<LeaderboardRow>[] = [
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
						return val ? (
							<span className="font-mono">{val.toFixed(3).replace(/^0/, "")}</span>
						) : (
							"-"
						);
					},
				},
			];
			const visibleBatting = batterCols.filter((col) =>
				battingStatSet.has(col.id as string),
			);
			baseColumns.push(...withLeadingSeparator(visibleBatting, addBattingSeparator));
		}

		if (playerView === "pitchers" || playerView === "all") {
			const pitcherCols: ColumnDef<LeaderboardRow>[] = [
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
					cell: ({ getValue }) => {
						const val = getValue() as number | null;
						return <span className="font-mono">{val ?? "-"}</span>;
					},
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
							? (row.player as unknown as Record<string, number>).QS
							: row.player._type === "two-way"
								? row.player._pitchingStats.QS
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
							? (row.player as unknown as Record<string, number>).CG
							: row.player._type === "two-way"
								? row.player._pitchingStats.CG
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
							? (row.player as unknown as Record<string, number>).ShO
							: row.player._type === "two-way"
								? row.player._pitchingStats.ShO
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
						return val ? (
							<span className="font-mono">{val.toFixed(2)}</span>
						) : (
							"-"
						);
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
						return val ? (
							<span className="font-mono">{val.toFixed(2)}</span>
						) : (
							"-"
						);
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
			leagueSettings,
			battingStatIds,
			pitchingStatIds,
		]);

	const currentPageRows = useMemo(() => {
		const effectivePageIndex = Math.min(
			pagination.pageIndex,
			Math.max(0, Math.ceil(searchedPlayers.length / pagination.pageSize) - 1),
		);
		const start = effectivePageIndex * pagination.pageSize;
		return searchedPlayers.slice(start, start + pagination.pageSize);
	}, [searchedPlayers, pagination.pageIndex, pagination.pageSize]);
	const totalRowCount = searchedPlayers.length;
	const pageCount = Math.max(1, Math.ceil(totalRowCount / pagination.pageSize));
	const effectivePageIndex = Math.min(pagination.pageIndex, pageCount - 1);
	const currentSort = sorting[0];

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
			<div className="flex h-96 flex-col items-center justify-center">
				<p className="mb-3 text-xl text-[#111111]/40 dark:text-[#e5e5e5]/30" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>No players loaded</p>
				<p className="text-sm text-[#111111]/30 dark:text-[#e5e5e5]/20">Upload a CSV file to get started</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="overflow-x-auto overflow-y-clip">
				<table className="w-full text-sm text-[#111111] dark:text-[#e5e5e5]">
					<thead>
						<tr>
							<th className="sticky left-0 top-0 z-20 w-12 border-b border-b-[#111111]/40 border-r border-[#111111]/10 bg-white px-2 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#111111]/35 shadow-[1px_0_0_rgba(17,17,17,0.06)] dark:border-b-[#e5e5e5]/25 dark:border-[#333333] dark:bg-[#111111] dark:text-[#e5e5e5]/30 dark:shadow-[1px_0_0_rgba(229,229,229,0.04)]">
								#
							</th>
							{columns.map((column, columnIndex) => {
								const columnId = getColumnId(column, columnIndex);
								const isSorted = currentSort?.id === columnId;
								const meta =
									(column.meta as { className?: string } | undefined) ?? undefined;

								return (
									<th
										key={columnId}
										style={{
											width:
												"size" in column && typeof column.size === "number"
													? column.size
													: undefined,
										}}
										className={`sticky top-0 z-10 border-b border-b-[#111111]/40 dark:border-b-[#e5e5e5]/25 border-[#111111]/10 dark:border-[#333333] bg-white dark:bg-[#111111] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 dark:text-[#e5e5e5]/50 whitespace-nowrap after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-1 after:bg-gradient-to-b after:from-black/[0.04] after:to-transparent dark:after:from-white/[0.06] relative cursor-pointer select-none hover:text-[#111111] dark:hover:text-[#e5e5e5] ${
											meta?.className ?? ""
										}`}
										onClick={() => setSorting((current) => getNextSorting(columnId, current))}
									>
										<div className="flex items-center gap-1 whitespace-nowrap">
											{renderColumnHeader(column)}
											{isSorted ? (currentSort?.desc ? " \u2193" : " \u2191") : null}
										</div>
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody>
						{currentPageRows.map((row, rowIndex) => (
							<tr
								key={row.player._id}
								onClick={() => handleRowClick(row)}
								onContextMenu={(e) => handleRowContextMenu(e, row)}
								className={`border-b border-[#111111]/10 dark:border-[#333333]/60 ${
									isDraftMode ? "cursor-pointer" : ""
								} ${
									row.isDrafted
										? "text-[#111111]/30 dark:text-[#e5e5e5]/20"
										: row.isKeeper
											? "bg-[#dc2626]/[0.03] dark:bg-[#ef4444]/[0.03]"
										: "hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]"
								}`}
							>
								<td className="sticky left-0 z-[1] w-12 border-r border-[#111111]/10 bg-white px-2 py-2.5 text-right font-mono text-[11px] text-[#111111]/38 shadow-[1px_0_0_rgba(17,17,17,0.06)] dark:border-[#333333] dark:bg-[#111111] dark:text-[#e5e5e5]/30 dark:shadow-[1px_0_0_rgba(229,229,229,0.04)]">
									{rankByPlayerId.get(row.player._id) ??
										effectivePageIndex * pagination.pageSize + rowIndex + 1}
								</td>
								{columns.map((column, columnIndex) => {
									const columnId = getColumnId(column, columnIndex);
									const meta =
										(column.meta as { className?: string } | undefined) ?? undefined;

									return (
									<td
										key={`${row.player._id}-${columnId}`}
										className={`px-3 py-2.5 ${meta?.className ?? ""}`}
									>
										{renderColumnCell(column, row)}
									</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#111111]/10 dark:border-[#333333] pt-4 text-xs text-[#111111]/60 dark:text-[#e5e5e5]/50">
				<div className="flex items-center gap-3">
					<button
						onClick={() =>
							setPagination((current) => ({
								...current,
								pageIndex: Math.max(0, current.pageIndex - 1),
							}))
						}
						disabled={effectivePageIndex === 0}
						className="text-xs font-bold uppercase tracking-widest text-[#111111]/60 dark:text-[#e5e5e5]/50 hover:text-[#111111] dark:hover:text-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-30"
					>
						Prev
					</button>
					<button
						onClick={() =>
							setPagination((current) => ({
								...current,
								pageIndex: Math.min(pageCount - 1, current.pageIndex + 1),
							}))
						}
						disabled={effectivePageIndex >= pageCount - 1}
						className="text-xs font-bold uppercase tracking-widest text-[#111111]/60 dark:text-[#e5e5e5]/50 hover:text-[#111111] dark:hover:text-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-30"
					>
						Next
					</button>
					<span>
						Page {effectivePageIndex + 1} of{" "}
						{pageCount}
					</span>
				</div>
				<div className="flex items-center gap-3">
					<span>
						{totalRowCount} total
					</span>
					<label className="flex items-center gap-2">
						<span>Rows</span>
						<MenuSelect
							value={pagination.pageSize}
							onChange={(nextSize) =>
								setPagination({ pageIndex: 0, pageSize: nextSize })
							}
							ariaLabel="Rows per page"
							triggerClassName="px-2 py-1 text-xs"
							menuClassName="min-w-[5rem]"
							menuPlacement="top-right"
							options={[
								{ value: 25, label: "25" },
								{ value: 50, label: "50" },
								{ value: 100, label: "100" },
							]}
						/>
					</label>
				</div>
			</div>
		</div>
	);
});
