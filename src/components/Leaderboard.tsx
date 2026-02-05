"use client";

import {
	useMemo,
	useState,
	useCallback,
	useDeferredValue,
	useEffect,
	useRef,
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
import {
	computeHitterEligibility,
	computePitcherEligibility,
	mergeTwoWayEligibility,
	emptyPositionGames,
	mergeWarnings,
	POSITION_ORDER,
	eligibilityFromProfilePosition,
} from "@/lib/eligibility";
import { fetchSeasonStatsForPlayers } from "@/lib/mlbStatsApi";
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
	Eligibility,
	LeagueSettings,
} from "@/types";

type PlayerView = "all" | "batters" | "pitchers";
type DraftFilter = "all" | "available" | "drafted" | "keepers";

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
		applyEligibilityForGroup,
	} = useStore();
	const currentGroupId =
		activeProjectionGroupId ?? projectionGroups[0]?.id ?? null;
	const deferredGroupId = useDeferredValue(currentGroupId);
	const isSwitchingGroups = deferredGroupId !== currentGroupId;
	const [globalFilter, setGlobalFilter] = useState("");
	const [playerView, setPlayerView] = useState<PlayerView>("all");
	const [draftFilter, setDraftFilter] = useState<DraftFilter>("available");
	const [isImporting, setIsImporting] = useState(false);
	const [importProgress, setImportProgress] = useState(0);
	const [importPlayer, setImportPlayer] = useState("");
	const [importError, setImportError] = useState<string | null>(null);
	const [retryStatus, setRetryStatus] = useState<string | null>(null);

	const handleImportEligibility = useCallback(async () => {
		if (!currentGroupId) return;
		const season = 2025;

		setIsImporting(true);
		setImportProgress(0);
		setImportPlayer("");
		setImportError(null);
		setRetryStatus(null);

		try {
			const retryOptions = {
				onRetry: ({
					attempt,
					delayMs,
					status,
				}: {
					attempt: number;
					delayMs: number;
					status?: number;
				}) => {
					const statusLabel = status ? `status ${status}` : "network error";
					setRetryStatus(
						`Retry ${attempt} in ${(delayMs / 1000).toFixed(1)}s (${statusLabel})`,
					);
				},
			};

			const activeGroup =
				projectionGroups.find((group) => group.id === currentGroupId) ??
				projectionGroups[0] ??
				null;

			const batters = activeGroup?.batters ?? [];
			const pitchers = activeGroup?.pitchers ?? [];
			const twoWayPlayers = activeGroup?.twoWayPlayers ?? [];
			const players = [...batters, ...pitchers, ...twoWayPlayers];

			if (players.length === 0) {
				setImportProgress(100);
				applyEligibilityForGroup(currentGroupId, new Map(), season);
				return;
			}

			const mlbIds = players
				.map((player) => player.MLBAMID)
				.filter((id) => typeof id === "string" && id.trim().length > 0);

			const {
				fieldingById: fieldingMap,
				pitchingById: pitchingMap,
				primaryPositionById,
			} = await fetchSeasonStatsForPlayers(mlbIds, season, retryOptions);

			const eligibilityById = new Map<string, Eligibility>();

      for (let i = 0; i < players.length; i += 1) {
        const player = players[i];
        setImportPlayer(player.Name);
        const warnings: string[] = [];

				if (!player.MLBAMID) {
					warnings.push("Missing MLBAMID");
				}

				if (player._type === "batter") {
					const fielding = player.MLBAMID
						? fieldingMap.get(player.MLBAMID)
						: undefined;
					const profilePosition = player.MLBAMID
						? primaryPositionById.get(player.MLBAMID)
						: undefined;
					const hasFielding =
						fielding && Object.values(fielding).some((value) => value > 0);

					if (!hasFielding && profilePosition) {
						warnings.push(`Profile fallback: ${profilePosition}`);
						const eligibility = eligibilityFromProfilePosition(
							profilePosition,
							season,
							warnings,
						);
						eligibilityById.set(player._id, eligibility);
					} else {
						if (!hasFielding) warnings.push("No fielding stats found");
						const positionGames = fielding ?? emptyPositionGames();
						const eligibility = computeHitterEligibility(
							positionGames,
							season,
							warnings,
						);
						eligibilityById.set(player._id, eligibility);
					}
				} else if (player._type === "pitcher") {
					const pitching = player.MLBAMID
						? pitchingMap.get(player.MLBAMID)
						: undefined;
					const profilePosition = player.MLBAMID
						? primaryPositionById.get(player.MLBAMID)
						: undefined;

					if (!pitching && profilePosition) {
						warnings.push(`Profile fallback: ${profilePosition}`);
						const eligibility = eligibilityFromProfilePosition(
							profilePosition,
							season,
							warnings,
						);
						eligibilityById.set(player._id, eligibility);
					} else {
						if (!pitching) warnings.push("No pitching stats found");
						const eligibility = computePitcherEligibility(
							pitching ?? { G: 0, GS: 0 },
							season,
							warnings,
						);
						eligibilityById.set(player._id, eligibility);
					}
				} else {
					const battingWarnings: string[] = [];
					const pitchingWarnings: string[] = [];

					if (!player.MLBAMID) {
						battingWarnings.push("Missing MLBAMID");
						pitchingWarnings.push("Missing MLBAMID");
					}

					const fielding = player.MLBAMID
						? fieldingMap.get(player.MLBAMID)
						: undefined;
					const profilePosition = player.MLBAMID
						? primaryPositionById.get(player.MLBAMID)
						: undefined;
					const hasFielding =
						fielding && Object.values(fielding).some((value) => value > 0);

					let battingEligibility: Eligibility;
					if (!hasFielding && profilePosition) {
						battingWarnings.push(`Profile fallback: ${profilePosition}`);
						battingEligibility = eligibilityFromProfilePosition(
							profilePosition,
							season,
							battingWarnings,
						);
					} else {
						if (!hasFielding) battingWarnings.push("No fielding stats found");
						battingEligibility = computeHitterEligibility(
							fielding ?? emptyPositionGames(),
							season,
							battingWarnings,
						);
					}

					const pitching = player.MLBAMID
						? pitchingMap.get(player.MLBAMID)
						: undefined;
					let pitchingEligibility: Eligibility;
					if (!pitching && profilePosition) {
						pitchingWarnings.push(`Profile fallback: ${profilePosition}`);
						pitchingEligibility = eligibilityFromProfilePosition(
							profilePosition,
							season,
							pitchingWarnings,
						);
					} else {
						if (!pitching) pitchingWarnings.push("No pitching stats found");
						pitchingEligibility = computePitcherEligibility(
							pitching ?? { G: 0, GS: 0 },
							season,
							pitchingWarnings,
						);
					}

					const merged = mergeTwoWayEligibility(
						battingEligibility,
						pitchingEligibility,
					);
					merged.warnings = mergeWarnings(
						battingEligibility.warnings,
						pitchingEligibility.warnings,
					);
					eligibilityById.set(player._id, merged);
				}

        const pct = Math.round(((i + 1) / players.length) * 100);
        setImportProgress(pct);

				if (i % 25 === 0) {
					await new Promise<void>((resolve) =>
						requestAnimationFrame(() => resolve()),
					);
				}
			}

			applyEligibilityForGroup(currentGroupId, eligibilityById, season);
		} catch (error) {
			setImportError(
				error instanceof Error ? error.message : "Failed to import eligibility",
			);
		} finally {
			setIsImporting(false);
			setRetryStatus(null);
			setImportPlayer("");
		}
	}, [applyEligibilityForGroup, currentGroupId, projectionGroups]);
	return (
		<div className="flex flex-col">
			{/* Filters */}
			<div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
				<div className="flex flex-wrap items-center gap-3">
					<input
						type="text"
						placeholder="Search players..."
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
						className="w-full min-w-[220px] flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
					/>

					<select
						value={playerView}
						onChange={(e) => setPlayerView(e.target.value as PlayerView)}
						className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
								className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
							>
								{projectionGroups.map((group) => (
									<option key={group.id} value={group.id}>
										{group.name}
									</option>
								))}
							</select>
							{isSwitchingGroups && (
								<span
									className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600"
									aria-label="Loading projections"
								/>
							)}
						</div>
					)}

					{currentGroupId && (
						<button
							onClick={() => void handleImportEligibility()}
							disabled={isImporting}
							className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isImporting ? "Importing Eligibility..." : "Import Eligibility"}
						</button>
					)}

					{isDraftMode && (
						<select
							value={draftFilter}
							onChange={(e) => setDraftFilter(e.target.value as DraftFilter)}
							className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
						>
							<option value="available">Available</option>
							<option value="all">All</option>
							<option value="drafted">Drafted</option>
							<option value="keepers">Keepers</option>
						</select>
					)}

					{isDraftMode && (
						<span className="text-xs text-slate-600">
							Click to draft, right-click for keeper
						</span>
					)}
				</div>
			</div>

			{(isImporting || importError) && (
				<div className="mb-4 rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm">
					{isImporting && (
						<>
							{(() => {
								const progressWidth = Math.min(
									100,
									Math.max(0, Number(importProgress) || 0),
								);
								return (
									<>
										<div className="mb-2 flex items-center justify-between">
											<span className="font-medium text-slate-700">
												Importing eligibility: {Math.round(progressWidth)}%
											</span>
											<span className="text-xs text-slate-500">
												{importPlayer}
											</span>
										</div>
										<div
											className="h-2 w-full overflow-hidden rounded bg-slate-200"
											style={{
												backgroundImage:
													"linear-gradient(to right, #10b981, #10b981)",
												backgroundSize: `${progressWidth}% 100%`,
												backgroundRepeat: "no-repeat",
											}}
											role="progressbar"
											aria-valuemin={0}
											aria-valuemax={100}
											aria-valuenow={Math.round(progressWidth)}
										/>
									</>
								);
							})()}
							{retryStatus && (
								<p className="mt-2 text-xs text-amber-800">
									{retryStatus}
								</p>
							)}
						</>
					)}
					{importError && !isImporting && (
						<div className="flex items-center justify-between">
							<span className="text-sm text-red-700">
								{importError}
							</span>
							<button
								onClick={() => void handleImportEligibility()}
								className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
							>
								Retry Import
							</button>
						</div>
					)}
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
	const rowIndexByIdRef = useRef<Map<string, number>>(new Map());

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
				id: "rank",
				header: "#",
				size: 50,
				cell: ({ row }) => (
					<span className="text-slate-700">
						{(rowIndexByIdRef.current.get(row.id) ?? row.index) + 1}
					</span>
				),
				enableSorting: false,
			},
			{
				accessorKey: "player.Name",
				header: "Name",
				size: 180,
				cell: ({ row }) => (
					<div className="flex items-center gap-2">
						{isDraftMode && (
							<input
								type="checkbox"
								checked={row.original.isDrafted || row.original.isKeeper}
								onChange={() => handleToggleDrafted(row.original.player._id)}
								className="h-4 w-4 rounded border-slate-300"
								onClick={(e) => e.stopPropagation()}
							/>
						)}
						<span
							className={
								row.original.isDrafted
									? "text-slate-600 line-through"
									: row.original.isKeeper
							? "font-semibold text-amber-800"
							: ""
					}
				>
					{row.original.player.Name}
				</span>
						{row.original.isDrafted && (
							<span className="rounded bg-emerald-100 px-1.5 text-xs text-emerald-800">
								{resolveTeamLabel(row.original.draftedTeamIndex)}
							</span>
						)}
						{row.original.isKeeper && (
							<span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">
								{resolveTeamLabel(row.original.keeperTeamIndex) ?? "K"}
							</span>
						)}
					</div>
				),
			},
			{
				accessorKey: "player.Team",
				header: "Team",
				size: 60,
			},
			{
				accessorKey: "player._type",
				header: "Type",
				size: 60,
				cell: ({ row }) => (
					<span
						className={`rounded px-1.5 py-0.5 text-xs font-medium ${
							row.original.player._type === "batter"
								? "bg-sky-100 text-sky-800"
								: row.original.player._type === "pitcher"
									? "bg-indigo-100 text-indigo-800"
									: "bg-amber-100 text-amber-800"
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
				header: "Elig",
				size: 140,
				accessorFn: (row) => formatEligibility(row.player),
				cell: ({ getValue }) => (
					<span className="text-xs text-slate-700">
						{getValue() as string}
					</span>
				),
			},
			{
				accessorKey: "projectedPoints",
				header: "Points",
				size: 80,
				cell: ({ row }) => (
					<span className="font-semibold text-emerald-700">
						{row.original.projectedPoints.toFixed(1)}
					</span>
				),
			},
		];

		// Add type-specific stat columns
		if (playerView === "batters" || playerView === "all") {
			const batterCols: ColumnDef<RankedPlayer>[] = [
				{
					id: "HR",
					header: "HR",
					size: 50,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).HR
							: row.player._type === "two-way"
								? row.player._battingStats.HR
								: null,
					cell: ({ getValue }) => getValue() ?? "-",
				},
				{
					id: "R",
					header: "R",
					size: 50,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).R
							: row.player._type === "two-way"
								? row.player._battingStats.R
								: null,
					cell: ({ getValue }) => getValue() ?? "-",
				},
				{
					id: "RBI",
					header: "RBI",
					size: 50,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).RBI
							: row.player._type === "two-way"
								? row.player._battingStats.RBI
								: null,
					cell: ({ getValue }) => getValue() ?? "-",
				},
				{
					id: "SB",
					header: "SB",
					size: 50,
					accessorFn: (row) =>
						row.player._type === "batter"
							? (row.player as unknown as Record<string, number>).SB
							: row.player._type === "two-way"
								? row.player._battingStats.SB
								: null,
					cell: ({ getValue }) => getValue() ?? "-",
				},
				{
					id: "AVG",
					header: "AVG",
					size: 60,
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
			baseColumns.push(...batterCols);
		}

		if (playerView === "pitchers" || playerView === "all") {
			const pitcherCols: ColumnDef<RankedPlayer>[] = [
				{
					id: "W",
					header: "W",
					size: 50,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).W
							: row.player._type === "two-way"
								? row.player._pitchingStats.W
								: null,
					cell: ({ getValue }) => getValue() ?? "-",
				},
				{
					id: "QS",
					header: "QS",
					size: 50,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? resolveQualityStarts(row.player, useBaseballIp)
							: row.player._type === "two-way"
								? resolveQualityStarts(row.player._pitchingStats, useBaseballIp)
								: null,
					cell: ({ getValue }) => {
						const val = getValue() as number | null;
						return val === null ? "-" : val.toFixed(1);
					},
				},
				{
					id: "CG",
					header: "CG",
					size: 50,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? resolveCompleteGames(row.player, useBaseballIp)
							: row.player._type === "two-way"
								? resolveCompleteGames(row.player._pitchingStats, useBaseballIp)
								: null,
					cell: ({ getValue }) => {
						const val = getValue() as number | null;
						return val === null ? "-" : val.toFixed(1);
					},
				},
				{
					id: "ShO",
					header: "ShO",
					size: 50,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? resolveShutouts(row.player, useBaseballIp)
							: row.player._type === "two-way"
								? resolveShutouts(row.player._pitchingStats, useBaseballIp)
								: null,
					cell: ({ getValue }) => {
						const val = getValue() as number | null;
						return val === null ? "-" : val.toFixed(1);
					},
				},
				{
					id: "SO_P",
					header: "K",
					size: 50,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).SO
							: row.player._type === "two-way"
								? row.player._pitchingStats.SO
								: null,
					cell: ({ getValue }) => getValue() ?? "-",
				},
				{
					id: "ERA",
					header: "ERA",
					size: 60,
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
					id: "IP",
					header: "IP",
					size: 50,
					accessorFn: (row) =>
						row.player._type === "pitcher"
							? (row.player as unknown as Record<string, number>).IP
							: row.player._type === "two-way"
								? row.player._pitchingStats.IP
								: null,
					cell: ({ getValue }) => getValue() ?? "-",
				},
			];
			baseColumns.push(...pitcherCols);
		}

		// ADP column
		baseColumns.push({
			id: "ADP",
			header: "ADP",
			size: 60,
			accessorFn: (row) =>
				(row.player as unknown as Record<string, number | null>).ADP,
			cell: ({ getValue }) => {
				const val = getValue() as number | null;
				return val ? Math.round(val) : "-";
			},
		});

		return baseColumns;
	}, [playerView, isDraftMode, handleToggleDrafted, useBaseballIp, leagueSettings]);

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
	const prePaginationRows = table.getPrePaginationRowModel().rows;
	const rowIndexById = useMemo(() => {
		const indexMap = new Map<string, number>();
		prePaginationRows.forEach((row, index) => {
			indexMap.set(row.id, index);
		});
		return indexMap;
	}, [prePaginationRows]);
	rowIndexByIdRef.current = rowIndexById;

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
			<div className="flex h-96 flex-col items-center justify-center text-slate-500">
				<p className="mb-2 text-lg">No players loaded</p>
				<p className="text-sm">Upload a CSV file to get started</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
				<table className="w-full text-sm text-slate-800">
					<thead className="bg-slate-100">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										style={{ width: header.getSize() }}
										className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 ${
											header.column.getCanSort()
												? "cursor-pointer select-none hover:text-slate-900"
												: ""
										}`}
										onClick={header.column.getToggleSortingHandler()}
									>
										<div className="flex items-center gap-1">
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
								className={`border-t border-slate-200 ${
									isDraftMode ? "cursor-pointer" : ""
								} ${
									row.original.isDrafted
										? "bg-slate-100"
										: row.original.isKeeper
											? "bg-amber-100/60"
											: index % 2 === 0
												? "bg-white hover:bg-slate-100"
												: "bg-slate-50 hover:bg-slate-100"
								}`}
							>
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} className="px-3 py-2">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
				<div className="flex items-center gap-2">
					<button
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Prev
					</button>
					<button
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Next
					</button>
					<span className="text-slate-600">
						Page {pagination.pageIndex + 1} of{" "}
						{Math.max(1, table.getPageCount())}
					</span>
				</div>
				<div className="flex items-center gap-3">
					<span className="text-slate-500">
						{table.getPrePaginationRowModel().rows.length} total
					</span>
					<label className="flex items-center gap-2">
						<span className="text-slate-500">Rows</span>
						<select
							value={pagination.pageSize}
							onChange={(e) => {
								const nextSize = Number(e.target.value);
								setPagination({ pageIndex: 0, pageSize: nextSize });
							}}
							className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
