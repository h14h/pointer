"use client";

import {
	useMemo,
	useState,
	useCallback,
	useDeferredValue,
	useEffect,
	useRef,
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
import { toast } from "sonner";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/Dropdown";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/Tooltip";
import { getDraftPickContext, getNextOpenPickIndex } from "@/lib/draft";
import { resolveProjectionGroupForLeague } from "@/lib/projections";
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
} from "@/lib/leaderboard";
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
	{ id: "IBB", label: "IBB" },
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
const EMPTY_DRAFT_HISTORY: DraftState["history"] = [];
const AUTO_ACTION_TOAST_DELAY_MS = 650;
const FOLLOW_UP_TOAST_DELAY_MS = 220;
const formatCountingStat = (value: number | null) =>
	value === null || Number.isNaN(value) ? (
		"-"
	) : (
		<span className="font-data">{Math.round(value)}</span>
	);

/* Text columns stay left-aligned; everything else is numeric and right-aligned */
const TEXT_COLUMN_IDS = new Set([
	"player.Name",
	"player.Team",
	"player._type",
	"eligibility",
]);

export function formatParForDisplay(par: number): string {
	const roundedPar = Math.round(par);
	if (roundedPar > 0) return `+${roundedPar}`;
	return `${roundedPar}`;
}

type PendingUndoToast = {
	playerName: string;
	teamName: string;
	overallPick: number;
};

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

/* Frozen-column geometry (px) — # | ADP | Name all stick left */
const FROZEN_RANK_W = 40;
const FROZEN_ADP_W = 55;
const FROZEN_ADP_LEFT = FROZEN_RANK_W;
const FROZEN_NAME_LEFT = FROZEN_RANK_W + FROZEN_ADP_W;

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

/* ---------------------------------------------------------------------------
   Columns picker — stat-visibility control
   --------------------------------------------------------------------------- */

function StatGroupHeader({
	label,
	count,
	onClear,
}: {
	label: string;
	count: number;
	onClear: () => void;
}) {
	return (
		<div className="flex min-h-5 items-center justify-between">
			<FieldLabel style={{ fontVariant: "small-caps" }}>{label}</FieldLabel>
			{count > 0 ? (
				<button
					type="button"
					onClick={onClear}
					className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-default)]"
					aria-label={`Clear ${label}`}
				>
					<svg viewBox="0 0 12 12" fill="none" className="size-3" aria-hidden="true">
						<path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
					</svg>
					Clear
				</button>
			) : null}
		</div>
	);
}

function ColumnsPicker({
	battingStatSet,
	pitchingStatSet,
	toggleStat,
	clearAllStats,
}: {
	battingStatSet: Set<string>;
	pitchingStatSet: Set<string>;
	toggleStat: (group: "batting" | "pitching", statId: string, checked: boolean) => void;
	clearAllStats: (group: "batting" | "pitching") => void;
}) {
	return (
		<Dropdown
			triggerValue="Columns"
			ariaLabel="Column visibility"
			placement="bottom-right"
			menuClassName="w-[min(28rem,calc(100vw-1.5rem))] max-w-none rounded-[var(--radius-lg)] py-0"
		>
			<div className="grid sm:grid-cols-2">
				{/* Batting */}
				<div className="border-b border-[var(--color-border-soft)] p-3 sm:border-b-0 sm:border-r sm:p-4">
					<StatGroupHeader label="Batting" count={battingStatSet.size} onClear={() => clearAllStats("batting")} />
					<div className="mt-2.5 grid grid-cols-4 gap-1.5 sm:grid-cols-3">
						{BATTING_STAT_OPTIONS.map((stat) => {
							const active = battingStatSet.has(stat.id);
							return (
								<button
									key={stat.id}
									type="button"
									onClick={() => toggleStat("batting", stat.id, !active)}
									className={
										active
											? "font-data rounded-sm px-1.5 py-1 text-center text-[11px] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
											: "font-data rounded-sm px-1.5 py-1 text-center text-[11px] bg-[var(--color-surface-raised)] text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-default)]"
									}
								>
									{stat.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* Pitching */}
				<div className="p-3 sm:p-4">
					<StatGroupHeader label="Pitching" count={pitchingStatSet.size} onClear={() => clearAllStats("pitching")} />
					<div className="mt-2.5 grid grid-cols-4 gap-1.5 sm:grid-cols-3">
						{PITCHING_STAT_OPTIONS.map((stat) => {
							const active = pitchingStatSet.has(stat.id);
							return (
								<button
									key={stat.id}
									type="button"
									onClick={() => toggleStat("pitching", stat.id, !active)}
									className={
										active
											? "font-data rounded-sm px-1.5 py-1 text-center text-[11px] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
											: "font-data rounded-sm px-1.5 py-1 text-center text-[11px] bg-[var(--color-surface-raised)] text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-default)]"
									}
								>
									{stat.label}
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</Dropdown>
	);
}

function PlayerViewFilter({
	value,
	onChange,
}: {
	value: PlayerView;
	onChange: (nextValue: PlayerView) => void;
}) {
	return (
		<Dropdown
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
		<Dropdown
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
		isDraftMode,
		draftPlayer,
		undoLastPick,
		mergeTwoWayRankings,
		leagues,
		activeLeagueId,
	} = useStore(
		useShallow((state) => ({
			projectionGroups: state.projectionGroups,
			isDraftMode: state.isDraftMode,
			draftPlayer: state.draftPlayer,
			undoLastPick: state.undoLastPick,
			mergeTwoWayRankings: state.mergeTwoWayRankings,
			leagues: state.leagues,
			activeLeagueId: state.activeLeagueId,
		})),
	);
	const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
	const scoringSettings = activeLeague?.scoringSettings;
	const leagueSettings = activeLeague?.leagueSettings;
	const draftState = activeLeague?.draftState;
	const draftHistory = draftState?.history ?? EMPTY_DRAFT_HISTORY;
	const lastDraftPick = draftHistory.at(-1) ?? null;
	const keeperByTeam = draftState?.keeperByTeam ?? {};
	const currentOpenPickIndex = draftState
		? getNextOpenPickIndex(
			leagueSettings.leagueSize,
			draftState.pickIndex ?? 0,
			draftState.format ?? "snake",
			draftState,
		)
		: 0;
	const currentPickContext = draftState
		? getDraftPickContext(
			leagueSettings.leagueSize,
			currentOpenPickIndex,
			draftState.format ?? "snake",
		)
		: null;
	const currentTeamName = currentPickContext
		? leagueSettings.teamNames[currentPickContext.teamIndex] ??
			`Team ${currentPickContext.teamIndex + 1}`
		: null;
	// Sport-scoped source resolution: the league's own selection with
	// library fallbacks (projections are shared across same-sport leagues)
	const activeGroup = activeLeague
		? resolveProjectionGroupForLeague(activeLeague, projectionGroups)
		: (projectionGroups[0] ?? null);
	const allPlayersById = useMemo(
		() =>
			new Map(
				[
					...(activeGroup?.batters ?? []),
					...(activeGroup?.pitchers ?? []),
					...(activeGroup?.twoWayPlayers ?? []),
				].map((player) => [player._id, player]),
			),
		[activeGroup],
	);
	const activeGroupId = activeGroup?.id ?? null;
	const deferredGroupId = useDeferredValue(activeGroupId);
	const isSwitchingGroups = deferredGroupId !== activeGroupId;
	const previousOpenPickIndexRef = useRef<number | null>(null);
	const autoActionToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const undoToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingUndoToastRef = useRef<PendingUndoToast | null>(null);
	const [globalFilter, setGlobalFilter] = useState("");
	const [appliedGlobalFilter, setAppliedGlobalFilter] = useState("");
	const [playerView, setPlayerView] = useState<PlayerView>("all");
	const [draftFilter, setDraftFilter] = useState<DraftFilter>("available");

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
	const handleUndoLastPick = useCallback(() => {
		if (!lastDraftPick) return;
		const playerName =
			allPlayersById.get(lastDraftPick.playerId)?.Name ?? "Draft pick";
		const teamName =
			leagueSettings.teamNames[lastDraftPick.teamIndex] ?? `Team ${lastDraftPick.teamIndex + 1}`;
		pendingUndoToastRef.current = {
			playerName,
			teamName,
			overallPick: lastDraftPick.overallPick,
		};
		if (undoToastTimeoutRef.current) {
			clearTimeout(undoToastTimeoutRef.current);
			undoToastTimeoutRef.current = null;
		}
		undoLastPick();
	}, [allPlayersById, lastDraftPick, leagueSettings, undoLastPick]);
	useEffect(() => {
		if (!isDraftMode || !draftState) {
			if (autoActionToastTimeoutRef.current) {
				clearTimeout(autoActionToastTimeoutRef.current);
				autoActionToastTimeoutRef.current = null;
			}
			if (undoToastTimeoutRef.current) {
				clearTimeout(undoToastTimeoutRef.current);
				undoToastTimeoutRef.current = null;
			}
			pendingUndoToastRef.current = null;
			previousOpenPickIndexRef.current = null;
			return;
		}

		const previousOpenPickIndex = previousOpenPickIndexRef.current;
		const skippedKeeperEntries = Object.entries(draftState.keeperSlotByPlayer)
			.filter(([playerId, slotIndex]) => {
				if (slotIndex === null || slotIndex === undefined) return false;
				if (draftState.keeperByTeam[playerId] === undefined) return false;
				if (previousOpenPickIndex === null) {
					return slotIndex < currentOpenPickIndex;
				}
				if (currentOpenPickIndex > previousOpenPickIndex) {
					return slotIndex > previousOpenPickIndex && slotIndex < currentOpenPickIndex;
				}
				if (currentOpenPickIndex < previousOpenPickIndex) {
					return slotIndex >= currentOpenPickIndex && slotIndex < previousOpenPickIndex;
				}
				return false;
			})
			.map(([playerId, slotIndex]) => ({
				playerId,
				slotIndex: slotIndex as number,
			}))
			.sort((left, right) => left.slotIndex - right.slotIndex);

		if (skippedKeeperEntries.length > 0) {
			const [firstSkippedKeeper] = skippedKeeperEntries;
			const skippedPlayerName =
				allPlayersById.get(firstSkippedKeeper.playerId)?.Name ?? "Keeper";
			const skippedTeamIndexRaw =
				draftState.keeperByTeam[firstSkippedKeeper.playerId];
			const skippedTeamIndex =
				skippedTeamIndexRaw === undefined
					? null
					: Number.parseInt(skippedTeamIndexRaw, 10);
			const skippedTeamName =
				skippedTeamIndex !== null && Number.isFinite(skippedTeamIndex)
					? leagueSettings.teamNames[skippedTeamIndex] ??
						`Team ${skippedTeamIndex + 1}`
					: null;
			const skippedPickLabel = `Pick ${firstSkippedKeeper.slotIndex + 1}`;
			if (autoActionToastTimeoutRef.current) {
				clearTimeout(autoActionToastTimeoutRef.current);
			}
			if (currentOpenPickIndex > (previousOpenPickIndex ?? -1)) {
				autoActionToastTimeoutRef.current = setTimeout(() => {
					toast(
						skippedKeeperEntries.length === 1 ? (
							<div className="flex items-center gap-2">
								<span>{skippedPlayerName}</span>
								<Chip tone="accent">
									K
								</Chip>
							</div>
						) : (
							"Auto-advanced"
						),
						{
							description:
								skippedKeeperEntries.length === 1
									? skippedTeamName
										? `${skippedTeamName} • ${skippedPickLabel}`
										: skippedPickLabel
									: `${skippedKeeperEntries.length} keeper slots skipped • Now on Pick ${currentOpenPickIndex + 1}`,
						},
					);
					autoActionToastTimeoutRef.current = null;
				}, AUTO_ACTION_TOAST_DELAY_MS);
			} else if (
				previousOpenPickIndex !== null &&
				currentOpenPickIndex < previousOpenPickIndex
			) {
				toast("Auto-rewound", {
					description:
						skippedKeeperEntries.length === 1
							? `${skippedPlayerName} • ${skippedPickLabel}`
							: `Cursor moved back across ${skippedKeeperEntries.length} keeper slots`,
				});
				if (pendingUndoToastRef.current) {
					const pendingUndoToast = pendingUndoToastRef.current;
					undoToastTimeoutRef.current = setTimeout(() => {
						toast("Pick undone", {
							description: `${pendingUndoToast.playerName} • ${pendingUndoToast.teamName} • Pick ${pendingUndoToast.overallPick}`,
							duration: 2200,
						});
						pendingUndoToastRef.current = null;
						undoToastTimeoutRef.current = null;
					}, FOLLOW_UP_TOAST_DELAY_MS);
				}
			}
		}

		if (pendingUndoToastRef.current && !undoToastTimeoutRef.current) {
			const pendingUndoToast = pendingUndoToastRef.current;
			toast("Pick undone", {
				description: `${pendingUndoToast.playerName} • ${pendingUndoToast.teamName} • Pick ${pendingUndoToast.overallPick}`,
				duration: 2200,
			});
			pendingUndoToastRef.current = null;
		}

		previousOpenPickIndexRef.current = currentOpenPickIndex;
		return () => {
			if (autoActionToastTimeoutRef.current) {
				clearTimeout(autoActionToastTimeoutRef.current);
				autoActionToastTimeoutRef.current = null;
			}
			if (undoToastTimeoutRef.current) {
				clearTimeout(undoToastTimeoutRef.current);
				undoToastTimeoutRef.current = null;
			}
		};
	}, [allPlayersById, currentOpenPickIndex, draftState, isDraftMode, leagueSettings]);
	const handleDraftPlayerFromBoard = useCallback(
		(player: RankedPlayer) => {
			if (!isDraftMode) return;
			if (player.isDrafted || player.isKeeper) return;
			const pickLabel = currentPickContext ? `Pick ${currentPickContext.overallPick}` : null;
			const receivingTeamName =
				currentTeamName ??
				(currentPickContext
					? leagueSettings.teamNames[currentPickContext.teamIndex] ??
						`Team ${currentPickContext.teamIndex + 1}`
					: null);
			draftPlayer(player.player._id);
			toast(player.player.Name, {
				description: receivingTeamName
					? `${receivingTeamName}${pickLabel ? ` • ${pickLabel}` : ""}`
					: pickLabel ?? "",
				duration: 2600,
			});
		},
		[
			isDraftMode,
			currentPickContext,
			currentTeamName,
			leagueSettings,
			draftPlayer,
		],
	);
	const tableNode = (
		<div className="relative">
			{(isSwitchingGroups || isApplyingFilters) && (
				<div className="pointer-events-none absolute inset-0 z-[2] bg-[color:color-mix(in_srgb,var(--color-bg-app)_60%,transparent)]" />
			)}
			<LeaderboardTable
				projectionGroups={projectionGroups}
				activeGroupId={deferredGroupId}
				scoringSettings={scoringSettings}
				leagueSettings={leagueSettings}
				draftState={draftState}
				isDraftMode={isDraftMode}
				mergeTwoWayRankings={mergeTwoWayRankings}
				onDraftPlayer={handleDraftPlayerFromBoard}
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
								Round {currentPickContext.round}, Pick {currentPickContext.pickInRound}
							</div>
							<div className="font-data text-xs text-[var(--color-fg-muted)]">
								{draftHistory.length} drafted, {Object.keys(keeperByTeam).length} keepers
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

					<PlayerViewFilter
						value={playerView}
						onChange={(nextValue) => {
							startTransition(() => {
								resetPagination();
								setPlayerView(nextValue);
							});
						}}
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
						<span className="stamp">
							Tap an available player to make the current pick
						</span>
					)}

					<ColumnsPicker
						battingStatSet={battingStatSet}
						pitchingStatSet={pitchingStatSet}
						toggleStat={toggleStat}
						clearAllStats={clearAllStats}
					/>
				</div>
			</div>
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
	onDraftPlayer: (player: RankedPlayer) => void;
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
	onDraftPlayer,
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
				size: 55,
				accessorFn: (row) =>
					(row.player as unknown as Record<string, number | null>).ADP,
				cell: ({ getValue }) => {
					const val = getValue() as number | null;
					return (
						<span className="font-data text-xs text-[var(--color-fg-muted)]">
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
						<span
							className={
								isDraftMode && row.original.isDrafted
									? "text-[13px] font-semibold text-[var(--color-fg-subtle)] line-through truncate"
									: row.original.isKeeper
										? "text-[13px] font-semibold text-[var(--color-fg-default)] truncate"
										: "text-[13px] font-semibold truncate"
							}
							title={row.original.player.Name}
						>
							{abbreviateName(row.original.player.Name)}
						</span>
						<div className="ml-auto flex shrink-0 items-center gap-1">
							{row.original.isDrafted && (
								<TooltipProvider delayDuration={140}>
									<Tooltip>
										<TooltipTrigger asChild>
											<Chip tone="neutral" tabIndex={0}>
												D
											</Chip>
										</TooltipTrigger>
										<TooltipContent side="top" align="end">
											{resolveTeamLabel(row.original.draftedTeamIndex)}
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
							{row.original.isKeeper && (
								<TooltipProvider delayDuration={140}>
									<Tooltip>
										<TooltipTrigger asChild>
											<Chip tone="accent" tabIndex={0}>
												K
											</Chip>
										</TooltipTrigger>
										<TooltipContent side="top" align="end">
											{resolveTeamLabel(row.original.keeperTeamIndex)}
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
						</div>
					</div>
				),
			},
			{
				accessorKey: "player.Team",
				header: "Team",
				size: 70,
				cell: ({ getValue }) => (
					<span className="font-data text-[10px] uppercase tracking-[0.08em] text-[var(--color-fg-muted)]">
						{getValue() as string}
					</span>
				),
			},
			{
				accessorKey: "player._type",
				header: "Type",
				size: 70,
				cell: ({ row }) => (
					<span className="font-data text-[10px] uppercase tracking-[0.08em] text-[var(--color-fg-muted)]">
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
						className="whitespace-nowrap font-data text-[10px] uppercase tracking-[0.08em] text-[var(--color-fg-muted)]"
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
					<span className="font-data font-semibold">
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
					const formatted = formatParForDisplay(row.original.par);
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
			const mergedClass = [existingClass, "border-l border-l-[var(--color-border-soft)]"]
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
					id: "IBB",
					header: "IBB",
					size: 60,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).IBB
							: row.player._type === "two-way"
								? row.player._battingStats.IBB
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
							<span className="font-data">{val.toFixed(3).replace(/^0/, "")}</span>
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
						return val != null ? (
							<span className="font-data">{val.toFixed(1)}</span>
						) : (
							"-"
						);
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
							<span className="font-data">{val.toFixed(2)}</span>
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
							<span className="font-data">{val.toFixed(2)}</span>
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
			if (player.isDrafted || player.isKeeper) return;
			onDraftPlayer(player);
		},
		[isDraftMode, onDraftPlayer],
	);

	if (
		!activeGroup ||
		(batters.length === 0 &&
			pitchers.length === 0 &&
			twoWayPlayers.length === 0)
	) {
		return (
			<div className="flex h-96 flex-col items-center justify-center text-center">
				<p className="stamp mb-2">No players loaded</p>
				<p className="text-sm text-[var(--color-fg-muted)]">Upload a CSV file to get started</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="mt-4 overflow-x-auto overflow-y-clip rounded-[var(--radius-md)] border border-[var(--color-border-soft)] bg-[var(--color-surface-base)]">
				<table className="w-full border-separate border-spacing-0 text-sm text-[var(--color-fg-default)]">
					<thead>
						<tr>
							<th style={{ width: FROZEN_RANK_W, minWidth: FROZEN_RANK_W, maxWidth: FROZEN_RANK_W }} className="stamp sticky left-0 top-0 z-20 border-b border-b-[var(--color-border-default)] bg-[var(--color-surface-base)] px-2 py-1.5 text-right sm:py-2 text-[var(--color-fg-subtle)]">
								#
							</th>
							{columns.map((column, columnIndex) => {
								const columnId = getColumnId(column, columnIndex);
								const isSorted = currentSort?.id === columnId;
								const isNumericColumn = !TEXT_COLUMN_IDS.has(columnId);
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
											...(columnId === "ADP" ? { left: FROZEN_ADP_LEFT, minWidth: FROZEN_ADP_W, maxWidth: FROZEN_ADP_W } :
												columnId === "player.Name" ? { left: FROZEN_NAME_LEFT } :
												{}),
										}}
										className={`stamp sticky top-0 z-10 border-b border-b-[var(--color-border-default)] bg-[var(--color-surface-base)] px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap relative cursor-pointer select-none ${
											isSorted
												? "text-[var(--color-accent)]"
												: "hover:text-[var(--color-fg-default)]"
										} ${isNumericColumn ? "text-right" : "text-left"} ${
											columnId === "ADP"
												? "z-20"
												: columnId === "player.Name"
													? "z-20 border-r border-r-[var(--color-border-soft)]"
													: ""
										} ${meta?.className ?? ""}`}
										onClick={() => setSorting((current) => getNextSorting(columnId, current))}
									>
										<div className={`flex items-center gap-1 whitespace-nowrap ${isNumericColumn ? "justify-end" : ""}`}>
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
								className={`group ${
									isDraftMode && !row.isDrafted && !row.isKeeper ? "cursor-pointer" : ""
								} ${
									isDraftMode && row.isDrafted
										? "bg-[var(--color-surface-muted)] text-[var(--color-fg-subtle)]"
										: row.isKeeper
											? "bg-[color:color-mix(in_srgb,var(--color-accent)_4%,transparent)]"
										: "hover:bg-[var(--color-surface-hover)]"
								}`}
							>
								<td style={{ width: FROZEN_RANK_W, minWidth: FROZEN_RANK_W, maxWidth: FROZEN_RANK_W }} className={`font-data sticky left-0 z-[1] border-b border-b-[var(--color-border-soft)] px-2 py-2 text-right sm:py-2.5 text-[11px] text-[var(--color-fg-subtle)] ${isDraftMode && row.isDrafted ? "bg-[color:color-mix(in_srgb,var(--color-fg-default)_4%,var(--color-surface-base))]" : row.isKeeper ? "bg-[color:color-mix(in_srgb,var(--color-accent)_5%,var(--color-surface-base))]" : "bg-[var(--color-surface-base)] group-hover:bg-[var(--color-surface-hover)]"}`}>
									{rankByPlayerId.get(row.player._id) ??
										effectivePageIndex * pagination.pageSize + rowIndex + 1}
								</td>
								{columns.map((column, columnIndex) => {
									const columnId = getColumnId(column, columnIndex);
									const meta =
										(column.meta as { className?: string } | undefined) ?? undefined;
									const isAdpColumn = columnId === "ADP";
									const isNameColumn = columnId === "player.Name";
									const isStickyColumn = isAdpColumn || isNameColumn;
									const isNumericColumn = !TEXT_COLUMN_IDS.has(columnId);
									const stickyBg = isDraftMode && row.isDrafted ? "bg-[color:color-mix(in_srgb,var(--color-fg-default)_4%,var(--color-surface-base))]" : row.isKeeper ? "bg-[color:color-mix(in_srgb,var(--color-accent)_5%,var(--color-surface-base))]" : "bg-[var(--color-surface-base)] group-hover:bg-[var(--color-surface-hover)]";

									return (
									<td
										key={`${row.player._id}-${columnId}`}
										style={isAdpColumn ? { left: FROZEN_ADP_LEFT, minWidth: FROZEN_ADP_W, maxWidth: FROZEN_ADP_W } : isNameColumn ? { left: FROZEN_NAME_LEFT } : undefined}
										className={`border-b border-b-[var(--color-border-soft)] px-2 py-2 sm:px-3 sm:py-2.5${isStickyColumn ? ` sticky z-[1] ${stickyBg}${isNameColumn ? " border-r border-r-[var(--color-border-soft)]" : ""}` : ""}${isNumericColumn ? " text-right" : ""} ${meta?.className ?? ""}`}
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
						Page {effectivePageIndex + 1} of{" "}
						{pageCount}
					</span>
				</div>
				<div className="flex items-center gap-2 sm:gap-3">
					<span>
						{totalRowCount} total
					</span>
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
	);
});
