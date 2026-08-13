"use client";

import {
	useCallback,
	useMemo,
	useState,
	startTransition,
	type ReactNode,
} from "react";
import { toast } from "sonner";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Panel } from "@/components/ui/Panel";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/Tooltip";
import { getDraftPickContext, getNextOpenPickIndex } from "@/lib/draft";
import { useStore } from "@/store";
import { useDebouncedCallback } from "@/lib/useDebounce";
import {
	buildFootballRankedPlayers,
	filterFootballRankedPlayers,
	normalizeFootballConfig,
	sortFootballRankedPlayers,
	type FootballDraftFilter,
	type FootballPositionFilter,
	type FootballRankedPlayer,
	type FootballSortKey,
} from "@/lib/football";
import { resolveProjectionGroupForLeague } from "@/lib/projections";
import type { FootballPlayer, FootballStats } from "@/types";
import { useShallow } from "zustand/react/shallow";
import { isFootballOverrideStat } from "@/lib/overrides";
import { OverrideEditor, OverrideTrigger } from "@/components/overrides/OverrideEditor";

/* ---------------------------------------------------------------------------
   Constants & helpers
   --------------------------------------------------------------------------- */

const POSITION_FILTER_OPTIONS: Array<{
	value: FootballPositionFilter;
	label: string;
}> = [
	{ value: "ALL", label: "All Positions" },
	{ value: "QB", label: "QB" },
	{ value: "RB", label: "RB" },
	{ value: "WR", label: "WR" },
	{ value: "TE", label: "TE" },
	{ value: "FLEX", label: "FLEX" },
	{ value: "K", label: "K" },
	{ value: "DST", label: "DST" },
];

/* Frozen-column geometry (px) — # | Name stick left */
const FROZEN_RANK_W = 40;
const FROZEN_NAME_LEFT = FROZEN_RANK_W;

type FootballStatKey = {
	[K in keyof FootballStats]: FootballStats[K] extends number ? K : never;
}[keyof FootballStats];

type StatColumnDef = { id: FootballStatKey; header: string };

const FLEX_STAT_COLUMNS: StatColumnDef[] = [
	{ id: "PASS_YDS", header: "Pass Yds" },
	{ id: "PASS_TD", header: "Pass TD" },
	{ id: "PASS_INT", header: "Int" },
	{ id: "RUSH_YDS", header: "Rush Yds" },
	{ id: "RUSH_TD", header: "Rush TD" },
	{ id: "REC", header: "Rec" },
	{ id: "REC_YDS", header: "Rec Yds" },
	{ id: "REC_TD", header: "Rec TD" },
];

const QB_STAT_COLUMNS: StatColumnDef[] = [
	{ id: "PASS_ATT", header: "Pass Att" },
	{ id: "PASS_CMP", header: "Cmp" },
	{ id: "PASS_YDS", header: "Pass Yds" },
	{ id: "PASS_TD", header: "Pass TD" },
	{ id: "PASS_INT", header: "Int" },
	{ id: "RUSH_ATT", header: "Rush Att" },
	{ id: "RUSH_YDS", header: "Rush Yds" },
	{ id: "RUSH_TD", header: "Rush TD" },
];

const RB_STAT_COLUMNS: StatColumnDef[] = [
	{ id: "RUSH_ATT", header: "Rush Att" },
	{ id: "RUSH_YDS", header: "Rush Yds" },
	{ id: "RUSH_TD", header: "Rush TD" },
	{ id: "TGT", header: "Tgt" },
	{ id: "REC", header: "Rec" },
	{ id: "REC_YDS", header: "Rec Yds" },
	{ id: "REC_TD", header: "Rec TD" },
	{ id: "FUML", header: "Fum" },
];

const RECEIVER_STAT_COLUMNS: StatColumnDef[] = [
	{ id: "TGT", header: "Tgt" },
	{ id: "REC", header: "Rec" },
	{ id: "REC_YDS", header: "Rec Yds" },
	{ id: "REC_TD", header: "Rec TD" },
	{ id: "RUSH_ATT", header: "Rush Att" },
	{ id: "RUSH_YDS", header: "Rush Yds" },
	{ id: "RUSH_TD", header: "Rush TD" },
	{ id: "FUML", header: "Fum" },
];

const K_STAT_COLUMNS: StatColumnDef[] = [
	{ id: "FG", header: "FG" },
	{ id: "FGA", header: "FGA" },
	{ id: "FG50", header: "FG 50+" },
	{ id: "XP", header: "XP" },
];

const DST_STAT_COLUMNS: StatColumnDef[] = [
	{ id: "SACK", header: "Sack" },
	{ id: "DST_INT", header: "Int" },
	{ id: "FR", header: "FR" },
	{ id: "FF", header: "FF" },
	{ id: "DST_TD", header: "TD" },
	{ id: "SAFETY", header: "Safety" },
	{ id: "BLK", header: "Blk" },
	{ id: "PTS_ALLOWED", header: "Pts Allowed" },
];

function getStatColumnsForFilter(
	positionFilter: FootballPositionFilter,
): StatColumnDef[] {
	switch (positionFilter) {
		case "QB":
			return QB_STAT_COLUMNS;
		case "RB":
			return RB_STAT_COLUMNS;
		case "WR":
		case "TE":
			return RECEIVER_STAT_COLUMNS;
		case "K":
			return K_STAT_COLUMNS;
		case "DST":
			return DST_STAT_COLUMNS;
		case "ALL":
		case "FLEX":
		default:
			return FLEX_STAT_COLUMNS;
	}
}

const formatCountingStat = (value: number | null) =>
	value === null || Number.isNaN(value) ? (
		"-"
	) : (
		<span className="font-data">{Math.round(value)}</span>
	);

/* Text columns stay left-aligned; everything else is numeric and right-aligned */
const TEXT_COLUMN_IDS = new Set(["name", "position"]);

function formatParForDisplay(par: number): string {
	const roundedPar = Math.round(par);
	if (roundedPar > 0) return `+${roundedPar}`;
	return `${roundedPar}`;
}

function abbreviateName(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].toUpperCase();
	const firstName = parts[0];
	const remaining = parts.slice(1).join(" ");
	return `${firstName[0].toUpperCase()}. ${remaining}`;
}

type SortState = { key: FootballSortKey; desc: boolean };

function getNextSort(key: FootballSortKey, current: SortState): SortState {
	if (current.key !== key) return { key, desc: false };
	return { key, desc: !current.desc };
}

type ColumnDef = {
	id: string;
	header: string;
	size?: number;
	sortKey?: FootballSortKey;
	cell: (row: FootballRankedPlayer) => ReactNode;
};

/* ---------------------------------------------------------------------------
   Component
   --------------------------------------------------------------------------- */

export function FootballLeaderboard() {
	const {
		projectionGroups,
		isDraftMode,
		draftPlayer,
		undoLastPick,
		activeLeague,
		hasHydrated,
		setPlayerStatOverride,
	} = useStore(
		useShallow((state) => ({
			projectionGroups: state.projectionGroups,
			isDraftMode: state.isDraftMode,
			draftPlayer: state.draftPlayer,
			undoLastPick: state.undoLastPick,
			activeLeague:
				state.leagues.find((l) => l.id === state.activeLeagueId) ??
				state.leagues[0],
			hasHydrated: state.hasHydrated,
			setPlayerStatOverride: state.setPlayerStatOverride,
		})),
	);

	const leagueSettings = activeLeague?.leagueSettings;
	const draftState = activeLeague?.draftState;
	const football = activeLeague?.football;
	const footballConfig = useMemo(
		() => normalizeFootballConfig(football),
		[football],
	);
	const draftHistory = draftState?.history ?? [];
	const lastDraftPick = draftHistory.at(-1) ?? null;
	const keeperByTeam = draftState?.keeperByTeam ?? {};
	const currentOpenPickIndex =
		draftState && leagueSettings
			? getNextOpenPickIndex(
				leagueSettings.leagueSize,
				draftState.pickIndex ?? 0,
				draftState.format ?? "snake",
				draftState,
			)
			: 0;
	const currentPickContext =
		draftState && leagueSettings
			? getDraftPickContext(
				leagueSettings.leagueSize,
				currentOpenPickIndex,
				draftState.format ?? "snake",
			)
			: null;
	const currentTeamName = currentPickContext
		? leagueSettings?.teamNames[currentPickContext.teamIndex] ??
			`Team ${currentPickContext.teamIndex + 1}`
		: null;

	// Sport-scoped source resolution: the league's own selection with
	// library fallbacks (projections are shared across same-sport leagues)
	const activeGroup = activeLeague
		? resolveProjectionGroupForLeague(activeLeague, projectionGroups)
		: null;

	const [globalFilter, setGlobalFilter] = useState("");
	const [appliedGlobalFilter, setAppliedGlobalFilter] = useState("");
	const [positionFilter, setPositionFilter] =
		useState<FootballPositionFilter>("ALL");
	const [draftFilter, setDraftFilter] = useState<FootballDraftFilter>("available");
	const [sort, setSort] = useState<SortState>({ key: "points", desc: true });
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
	const [editingPlayer, setEditingPlayer] = useState<FootballPlayer | null>(null);

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

	const rankedPlayers = useMemo(() => {
		if (!activeGroup || !draftState || !leagueSettings) return [];
		return buildFootballRankedPlayers({
			activeGroup,
			config: footballConfig,
			leagueSize: leagueSettings.leagueSize,
			draftState,
			playerStatOverrides: activeLeague.playerStatOverrides,
		});
	}, [activeGroup, footballConfig, leagueSettings, draftState, activeLeague]);

	const filteredPlayers = useMemo(
		() =>
			filterFootballRankedPlayers(
				rankedPlayers,
				positionFilter,
				isDraftMode ? draftFilter : "all",
				"",
			),
		[rankedPlayers, positionFilter, isDraftMode, draftFilter],
	);

	const sortedPlayers = useMemo(
		() =>
			sortFootballRankedPlayers(
				filteredPlayers,
				sort.key,
				sort.desc ? "desc" : "asc",
			),
		[filteredPlayers, sort],
	);

	const rankByPlayerId = useMemo(
		() =>
			new Map(sortedPlayers.map((row, index) => [row.player._id, index + 1])),
		[sortedPlayers],
	);

	const searchedPlayers = useMemo(
		() =>
			filterFootballRankedPlayers(sortedPlayers, "ALL", "all", appliedGlobalFilter),
		[sortedPlayers, appliedGlobalFilter],
	);

	const handleUndoLastPick = useCallback(() => {
		if (!lastDraftPick) return;
		const playerName =
			activeGroup?.footballPlayers?.find(
				(p) => p._id === lastDraftPick.playerId,
			)?.Name ?? "Draft pick";
		const teamName =
			leagueSettings?.teamNames[lastDraftPick.teamIndex] ??
			`Team ${lastDraftPick.teamIndex + 1}`;
		undoLastPick();
		toast("Pick undone", {
			description: `${playerName} • ${teamName} • Pick ${lastDraftPick.overallPick}`,
			duration: 2200,
		});
	}, [activeGroup, lastDraftPick, leagueSettings, undoLastPick]);

	const handleDraftPlayer = useCallback(
		(row: FootballRankedPlayer) => {
			if (!isDraftMode) return;
			if (row.isDrafted || row.isKeeper) return;
			const pickLabel = currentPickContext
				? `Pick ${currentPickContext.overallPick}`
				: null;
			draftPlayer(row.player._id);
			toast(row.player.Name, {
				description: currentTeamName
					? `${currentTeamName}${pickLabel ? ` • ${pickLabel}` : ""}`
					: pickLabel ?? "",
				duration: 2600,
			});
		},
		[isDraftMode, currentPickContext, currentTeamName, draftPlayer],
	);

	const columns = useMemo<ColumnDef[]>(() => {
		const resolveTeamLabel = (teamIndex?: number) => {
			if (teamIndex === undefined || Number.isNaN(teamIndex)) return null;
			return (
				leagueSettings?.teamNames[teamIndex] ?? `Team ${teamIndex + 1}`
			);
		};
		const baseColumns: ColumnDef[] = [
			{
				id: "name",
				header: "Player",
				size: 170,
				sortKey: "name",
				cell: (row) => (
					<div className="flex min-w-0 items-center gap-2">
						<button
							type="button"
							className={
								isDraftMode && row.isDrafted
									? "truncate text-left text-[13px] font-semibold text-[var(--color-fg-subtle)] line-through"
									: "truncate text-left text-[13px] font-semibold hover:text-[var(--color-accent)]"
							}
							title={`${row.player.Name} — edit overlays`}
							onClick={(event) => {
								event.stopPropagation();
								const uploaded = activeGroup?.footballPlayers?.find(
									(player) => player._id === row.player._id,
								);
								setEditingPlayer(uploaded ?? row.player);
							}}
						>
							{abbreviateName(row.player.Name)}
						</button>
						<span className="font-data shrink-0 text-[10px] uppercase tracking-[0.08em] text-[var(--color-fg-muted)]">
							{row.player.Team}
						</span>
						<div className="ml-auto flex shrink-0 items-center gap-1">
							<OverrideTrigger
								hasOverrides={row.hasOverrides}
								onClick={(event) => {
									event.stopPropagation();
									const uploaded = activeGroup?.footballPlayers?.find(
										(player) => player._id === row.player._id,
									);
									setEditingPlayer(uploaded ?? row.player);
								}}
							/>
							{row.isDrafted && (
								<TooltipProvider delayDuration={140}>
									<Tooltip>
										<TooltipTrigger asChild>
											<Chip tone="neutral" tabIndex={0}>
												D
											</Chip>
										</TooltipTrigger>
										<TooltipContent side="top" align="end">
											{resolveTeamLabel(row.draftedTeamIndex)}
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
							{row.isKeeper && (
								<TooltipProvider delayDuration={140}>
									<Tooltip>
										<TooltipTrigger asChild>
											<Chip tone="accent" tabIndex={0}>
												K
											</Chip>
										</TooltipTrigger>
										<TooltipContent side="top" align="end">
											{resolveTeamLabel(row.keeperTeamIndex)}
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
						</div>
					</div>
				),
			},
			{
				id: "position",
				header: "Pos",
				size: 60,
				cell: (row) => (
					<span className="font-data text-[10px] uppercase tracking-[0.08em] text-[var(--color-fg-muted)]">
						{row.player.Position}
					</span>
				),
			},
			{
				id: "bye",
				header: "Bye",
				size: 55,
				cell: (row) =>
					row.player.BYE != null ? (
						<span className="font-data text-xs text-[var(--color-fg-muted)]">
							{row.player.BYE}
						</span>
					) : (
						"-"
					),
			},
			{
				id: "points",
				header: "PTS",
				size: 80,
				sortKey: "points",
				cell: (row) => (
					<span className="font-data font-semibold">
						{Math.round(row.projectedPoints)}
					</span>
				),
			},
			{
				id: "par",
				header: "PAR",
				size: 70,
				sortKey: "par",
				cell: (row) => {
					const val = Math.round(row.par);
					return (
						<span
							className={`font-data text-xs ${
								val > 0
									? "text-[var(--color-accent)]"
									: val < 0
										? "text-[var(--color-warning)]"
										: "text-[var(--color-fg-subtle)]"
							}`}
						>
							{formatParForDisplay(row.par)}
						</span>
					);
				},
			},
			{
				id: "adp",
				header: "ADP",
				size: 60,
				sortKey: "adp",
				cell: (row) => (
					<span className="font-data text-xs text-[var(--color-fg-muted)]">
						{row.player.ADP != null ? row.player.ADP.toFixed(1) : "-"}
					</span>
				),
			},
		];

		const statColumns: ColumnDef[] = getStatColumnsForFilter(positionFilter).map(
			(stat) => ({
				id: stat.id,
				header: stat.header,
				size: 70,
				cell: (row) => {
					const overridden =
						isFootballOverrideStat(stat.id) &&
						activeLeague?.playerStatOverrides?.[row.player._id]?.[stat.id] !==
							undefined;
					return (
						<span className={overridden ? "text-[var(--color-accent)]" : undefined}>
							{formatCountingStat(row.player[stat.id])}
						</span>
					);
				},
			}),
		);

		return [...baseColumns, ...statColumns];
	}, [isDraftMode, leagueSettings, positionFilter, activeGroup, activeLeague]);

	const currentPageRows = useMemo(() => {
		const effectivePage = Math.min(
			pagination.pageIndex,
			Math.max(0, Math.ceil(searchedPlayers.length / pagination.pageSize) - 1),
		);
		const start = effectivePage * pagination.pageSize;
		return searchedPlayers.slice(start, start + pagination.pageSize);
	}, [searchedPlayers, pagination.pageIndex, pagination.pageSize]);
	const totalRowCount = searchedPlayers.length;
	const pageCount = Math.max(1, Math.ceil(totalRowCount / pagination.pageSize));
	const effectivePageIndex = Math.min(pagination.pageIndex, pageCount - 1);

	// Avoid SSR/client markup mismatch while the persisted store hydrates
	if (!hasHydrated) return null;

	const footballPlayers = activeGroup?.footballPlayers ?? [];
	if (!activeGroup || footballPlayers.length === 0) {
		return (
			<Panel className="flex h-96 flex-col items-center justify-center text-center">
				<p className="stamp mb-2">No football players loaded</p>
				<p className="text-sm text-[var(--color-fg-muted)]">
					Upload a football projections CSV in Settings → Projections to get
					started
				</p>
			</Panel>
		);
	}

	return (
		<div className="flex flex-col font-sans">
			{/* Filters */}
			<div className="w-full">
				{isDraftMode && currentPickContext ? (
					<div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
						<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
							<div>
								<div className="stamp">On The Clock</div>
								<div className="text-sm font-semibold text-[var(--color-fg-default)]">
									{currentTeamName}
								</div>
							</div>
							<div className="font-data text-xs text-[var(--color-fg-muted)]">
								Pick {currentPickContext.overallPick}
							</div>
							<div className="font-data text-xs text-[var(--color-fg-muted)]">
								Round {currentPickContext.round}, Pick{" "}
								{currentPickContext.pickInRound}
							</div>
							<div className="font-data text-xs text-[var(--color-fg-muted)]">
								{draftHistory.length} drafted, {Object.keys(keeperByTeam).length}{" "}
								keepers
							</div>
						</div>
						<Button
							type="button"
							onClick={handleUndoLastPick}
							disabled={draftHistory.length === 0}
							variant="toolbar"
							size="sm"
						>
							Undo Last Pick
						</Button>
					</div>
				) : null}
				<div className="flex flex-wrap items-center gap-2 sm:gap-3">
					<Input
						type="text"
						placeholder="Search players..."
						value={globalFilter}
						onChange={(e) => {
							const nextValue = e.target.value;
							setGlobalFilter(nextValue);
							applySearchFilter(nextValue);
						}}
						className="w-full min-w-0 flex-1"
					/>

					<Dropdown
						value={positionFilter}
						onChange={(nextValue) => {
							startTransition(() => {
								resetPagination();
								setPositionFilter(nextValue);
							});
						}}
						ariaLabel="Position"
						options={POSITION_FILTER_OPTIONS}
					/>

					{isDraftMode && (
						<Dropdown
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

					{isDraftMode && (
						<span className="stamp">
							Tap an available player to make the current pick
						</span>
					)}
				</div>
			</div>

			{/* Table */}
			<div className="space-y-4">
				<div className="mt-4 overflow-x-auto overflow-y-clip rounded-[var(--radius-md)] border border-[var(--color-border-soft)] bg-[var(--color-surface-base)]">
					<table className="w-full border-separate border-spacing-0 text-sm text-[var(--color-fg-default)]">
						<thead>
							<tr>
								<th
									style={{ width: FROZEN_RANK_W, minWidth: FROZEN_RANK_W, maxWidth: FROZEN_RANK_W }}
									className="stamp sticky left-0 top-0 z-20 border-b border-b-[var(--color-border-default)] bg-[var(--color-surface-base)] px-2 py-1.5 text-right text-[var(--color-fg-subtle)] sm:py-2"
								>
									#
								</th>
								{columns.map((column) => {
									const isSorted =
										column.sortKey !== undefined && sort.key === column.sortKey;
									const isNameColumn = column.id === "name";
									const isNumericColumn = !TEXT_COLUMN_IDS.has(column.id);
									return (
										<th
											key={column.id}
											style={{
												width: column.size,
												...(isNameColumn ? { left: FROZEN_NAME_LEFT } : {}),
											}}
											className={`stamp sticky top-0 z-10 whitespace-nowrap border-b border-b-[var(--color-border-default)] bg-[var(--color-surface-base)] px-2 py-1.5 select-none sm:px-3 sm:py-2 ${
												isSorted ? "text-[var(--color-accent)]" : ""
											} ${isNumericColumn ? "text-right" : "text-left"} ${
												isNameColumn
													? "z-20 border-r border-r-[var(--color-border-soft)]"
													: ""
											} ${
												column.sortKey !== undefined
													? "cursor-pointer hover:text-[var(--color-fg-default)]"
													: ""
											}`}
											onClick={
												column.sortKey !== undefined
													? () =>
														setSort((current) =>
															getNextSort(column.sortKey as FootballSortKey, current),
														)
													: undefined
											}
										>
											<div className={`flex items-center gap-1 whitespace-nowrap ${isNumericColumn ? "justify-end" : ""}`}>
												{column.header}
												{isSorted ? (sort.desc ? " ↓" : " ↑") : null}
											</div>
										</th>
									);
								})}
							</tr>
						</thead>
						<tbody>
							{currentPageRows.map((row, rowIndex) => {
								const stickyBg =
									isDraftMode && row.isDrafted
										? "bg-[color:color-mix(in_srgb,var(--color-fg-default)_4%,var(--color-surface-base))]"
										: row.isKeeper
											? "bg-[color:color-mix(in_srgb,var(--color-accent)_5%,var(--color-surface-base))]"
											: "bg-[var(--color-surface-base)] group-hover:bg-[var(--color-surface-hover)]";
								return (
									<tr
										key={row.player._id}
										onClick={() => handleDraftPlayer(row)}
										className={`group ${
											isDraftMode && !row.isDrafted && !row.isKeeper
												? "cursor-pointer"
												: ""
										} ${
											isDraftMode && row.isDrafted
												? "bg-[var(--color-surface-muted)] text-[var(--color-fg-subtle)]"
												: row.isKeeper
													? "bg-[color:color-mix(in_srgb,var(--color-accent)_4%,transparent)]"
													: "hover:bg-[var(--color-surface-hover)]"
										}`}
									>
										<td
											style={{ width: FROZEN_RANK_W, minWidth: FROZEN_RANK_W, maxWidth: FROZEN_RANK_W }}
											className={`font-data sticky left-0 z-[1] border-b border-b-[var(--color-border-soft)] px-2 py-2 text-right text-[11px] text-[var(--color-fg-subtle)] sm:py-2.5 ${stickyBg}`}
										>
											{rankByPlayerId.get(row.player._id) ??
												effectivePageIndex * pagination.pageSize + rowIndex + 1}
										</td>
										{columns.map((column) => {
											const isNameColumn = column.id === "name";
											const isNumericColumn = !TEXT_COLUMN_IDS.has(column.id);
											return (
												<td
													key={`${row.player._id}-${column.id}`}
													style={isNameColumn ? { left: FROZEN_NAME_LEFT } : undefined}
													className={`border-b border-b-[var(--color-border-soft)] px-2 py-2 sm:px-3 sm:py-2.5${
														isNameColumn
															? ` sticky z-[1] max-w-[170px] ${stickyBg} border-r border-r-[var(--color-border-soft)]`
															: ""
													}${isNumericColumn ? " text-right" : ""}`}
												>
													{column.cell(row)}
												</td>
											);
										})}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-soft)] pt-3 font-data text-xs text-[var(--color-fg-muted)] sm:gap-3">
					<div className="flex items-center gap-2 sm:gap-3">
						<button
							onClick={() =>
								setPagination((current) => ({
									...current,
									pageIndex: Math.max(0, current.pageIndex - 1),
								}))
							}
							disabled={effectivePageIndex === 0}
							className="font-data text-xs uppercase tracking-[0.08em] text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] disabled:cursor-not-allowed disabled:opacity-30"
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
							className="font-data text-xs uppercase tracking-[0.08em] text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] disabled:cursor-not-allowed disabled:opacity-30"
						>
							Next
						</button>
						<span>
							Page {effectivePageIndex + 1} of {pageCount}
						</span>
					</div>
					<div className="flex items-center gap-2 sm:gap-3">
						<span>{totalRowCount} total</span>
						<label className="flex items-center gap-2">
							<span>Rows</span>
							<Dropdown
								value={pagination.pageSize}
								onChange={(nextSize) =>
									setPagination({ pageIndex: 0, pageSize: nextSize })
								}
								ariaLabel="Rows per page"
								triggerClassName="px-2 py-1 text-xs"
								menuClassName="min-w-[5rem]"
								placement="top-right"
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
			<OverrideEditor
				player={editingPlayer}
				override={
					editingPlayer
						? activeLeague?.playerStatOverrides?.[editingPlayer._id]
						: undefined
				}
				open={editingPlayer !== null}
				onOpenChange={(open) => {
					if (!open) setEditingPlayer(null);
				}}
				onChangeStat={(stat, value) => {
					if (!editingPlayer) return;
					setPlayerStatOverride(editingPlayer._id, stat, value);
				}}
			/>
		</div>
	);
}
