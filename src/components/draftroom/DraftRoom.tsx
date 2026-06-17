"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  getDraftPickContext,
  getNextOpenPickIndex,
  getReservedKeeperPickMap,
} from "@/lib/draft";
import { useSettleNightTransition } from "@/lib/nightTransition";
import { useNightMode } from "@/lib/useNightMode";
import { Chip } from "@/components/ui/Chip";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { useStore } from "@/store";
import { useLeagueProjectionGroup, useRouteLeague } from "@/store/selectors";
import type { League, ProjectionGroup } from "@/types";
import { Board } from "./Board";
import { EndDraftNightButton } from "./EndDraftNightButton";
import { ResetDraftControl } from "./ResetDraftControl";
import {
  abbrevTeamName,
  buildRoomPlayers,
  buildTapeCells,
  getTotalRounds,
  shortPlayerName,
  type LoggedPick,
  type MyRosterRow,
  type RoomPlayer,
  type WireRow,
} from "./model";
import { QuickLog } from "./QuickLog";
import { Rail } from "./Rail";
import { RosterList } from "./RosterList";
import { SyncStrip } from "./SyncStrip";
import { Tape } from "./Tape";

/**
 * The live draft tracker. Users manually log every pick against the tape,
 * quick-log bar, board, and sync rail. Nothing ever auto-advances.
 */
export function DraftRoom() {
  useNightMode();
  // Arriving under the transition veil — lift it now that the tracker is mounted.
  useSettleNightTransition();
  const league = useRouteLeague();
  const group = useLeagueProjectionGroup(league);

  // Pre-hydration placeholder MUST match WorkspaceShell's: the shell page is
  // prerendered once (as the plan tab), so a draft deep-link's first client
  // render has to produce the same tree as that static HTML or React reports
  // a hydration mismatch on every /league/<id>/draft refresh.
  if (!league) return <div className="min-h-screen" />;

  return <Cockpit league={league} group={group} />;
}

function Cockpit({
  league,
  group,
}: {
  league: League;
  group: ProjectionGroup | null;
}) {
  const { draftPlayer, undoLastPick, mergeTwoWayRankings } = useStore(
    useShallow((state) => ({
      draftPlayer: state.draftPlayer,
      undoLastPick: state.undoLastPick,
      mergeTwoWayRankings: state.mergeTwoWayRankings,
    })),
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const [lastLog, setLastLog] = useState<LoggedPick | null>(null);

  const { leagueSettings, draftState } = league;
  const leagueSize = leagueSettings.leagueSize;
  const teamNames = leagueSettings.teamNames;
  const myTeamIndex = league.myTeamIndex ?? 0;
  const format = draftState.format ?? "snake";
  const totalRounds = useMemo(() => getTotalRounds(league), [league]);
  const totalPicks = leagueSize * totalRounds;
  const history = draftState.history;

  /* Full ranked pool (drafted + keepers included) and lookups */
  const players = useMemo(
    () => buildRoomPlayers(league, group, mergeTwoWayRankings),
    [league, group, mergeTwoWayRankings],
  );
  const playersById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );
  const available = useMemo(
    () => players.filter((p) => !p.isDrafted && !p.isKeeper),
    [players],
  );
  const targetIds = useMemo(
    () => new Set(league.strategy?.targetIds ?? []),
    [league.strategy?.targetIds],
  );
  const hasBye =
    league.sport === "football" && players.some((p) => p.bye !== null);

  const reservedKeeperPicks = useMemo(
    () => getReservedKeeperPickMap(draftState),
    [draftState],
  );

  /* Current open pick + where my next pick lands */
  const sync = useMemo(() => {
    const openIndex = getNextOpenPickIndex(
      leagueSize,
      draftState.pickIndex ?? 0,
      format,
      draftState,
    );
    const isComplete = openIndex >= totalPicks;
    const context = getDraftPickContext(leagueSize, openIndex, format);
    const onClockTeamName =
      teamNames[context.teamIndex] ?? `Team ${context.teamIndex + 1}`;

    let myNextOverall: number | null = null;
    let picksUntilMine = 0;
    for (let i = openIndex; i < totalPicks; i++) {
      if (reservedKeeperPicks.has(i)) continue;
      const c = getDraftPickContext(leagueSize, i, format);
      if (c.teamIndex === myTeamIndex) {
        myNextOverall = c.overallPick;
        break;
      }
      picksUntilMine += 1;
    }

    return {
      openIndex,
      isComplete,
      context,
      onClockTeamName,
      isMyPick: !isComplete && context.teamIndex === myTeamIndex,
      myNextOverall,
      picksUntilMine,
    };
  }, [
    draftState,
    leagueSize,
    format,
    totalPicks,
    reservedKeeperPicks,
    myTeamIndex,
    teamNames,
  ]);

  const tapeCells = useMemo(
    () =>
      buildTapeCells({
        leagueSize,
        totalRounds,
        format,
        history,
        reservedKeeperPicks,
        playersById,
        myTeamIndex,
        teamNames,
      }),
    [
      leagueSize,
      totalRounds,
      format,
      history,
      reservedKeeperPicks,
      playersById,
      myTeamIndex,
      teamNames,
    ],
  );

  /* My picks + my keepers, round-ordered */
  const myRoster = useMemo<MyRosterRow[]>(() => {
    const rows: MyRosterRow[] = [];
    for (const pick of history) {
      if (pick.teamIndex !== myTeamIndex) continue;
      rows.push({
        id: pick.playerId,
        round: pick.round,
        name: shortPlayerName(playersById.get(pick.playerId)?.name ?? "unknown"),
        isKeeper: false,
      });
    }
    for (const [playerId, teamKey] of Object.entries(draftState.keeperByTeam)) {
      if (Number(teamKey) !== myTeamIndex) continue;
      const slotIndex = draftState.keeperSlotByPlayer[playerId];
      const round =
        slotIndex !== null && slotIndex !== undefined
          ? getDraftPickContext(leagueSize, slotIndex, format).round
          : null;
      rows.push({
        id: playerId,
        round,
        name: shortPlayerName(playersById.get(playerId)?.name ?? "unknown"),
        isKeeper: true,
      });
    }
    rows.sort(
      (a, b) =>
        (a.round ?? Number.MAX_SAFE_INTEGER) -
        (b.round ?? Number.MAX_SAFE_INTEGER),
    );
    return rows;
  }, [history, draftState, playersById, myTeamIndex, leagueSize, format]);

  /* Every logged pick, newest first */
  const wire = useMemo<WireRow[]>(
    () =>
      [...history].reverse().map((pick) => ({
        overall: pick.overallPick,
        playerName: shortPlayerName(
          playersById.get(pick.playerId)?.name ?? "unknown",
        ),
        teamAbbrev: abbrevTeamName(
          teamNames[pick.teamIndex] ?? `Team ${pick.teamIndex + 1}`,
        ),
        isMine: pick.teamIndex === myTeamIndex,
      })),
    [history, playersById, teamNames, myTeamIndex],
  );

  const logPlayer = useCallback(
    (player: RoomPlayer) => {
      if (sync.isComplete || player.isDrafted || player.isKeeper) return;
      setLastLog({
        overall: sync.context.overallPick,
        playerName: shortPlayerName(player.name),
        teamName: sync.onClockTeamName,
      });
      draftPlayer(player.id);
      inputRef.current?.focus();
    },
    [sync, draftPlayer],
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    undoLastPick();
    setLastLog(null);
    inputRef.current?.focus();
  }, [history.length, undoLastPick]);

  if (sync.isComplete) {
    return (
      <DraftComplete
        league={league}
        myRoster={myRoster}
        totalPicks={totalPicks}
        totalRounds={totalRounds}
      />
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <SyncStrip
        leagueId={league.id}
        leagueName={league.name}
        overall={sync.context.overallPick}
        round={sync.context.round}
        pickInRound={sync.context.pickInRound}
        onClockTeamName={sync.onClockTeamName}
        isMyPick={sync.isMyPick}
        myNextOverall={sync.myNextOverall}
        picksUntilMine={sync.picksUntilMine}
        loggedCount={history.length}
        totalPicks={totalPicks}
      />

      <Tape cells={tapeCells} currentSlotIndex={sync.openIndex} />

      <QuickLog
        available={available}
        targetIds={targetIds}
        isMyPick={sync.isMyPick}
        onClockTeamName={sync.onClockTeamName}
        // A draft reset empties the history — drop the stale "logged:" line
        // with it rather than advertising an undo for a pick that's gone
        lastLog={history.length === 0 ? null : lastLog}
        canUndo={history.length > 0}
        onLog={logPlayer}
        onUndo={handleUndo}
        inputRef={inputRef}
      />

      <main className="flex min-h-0 flex-1 gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <Board
          available={available}
          targetIds={targetIds}
          sport={league.sport}
          hasBye={hasBye}
          onClockTeamName={sync.onClockTeamName}
          onLog={logPlayer}
        />
        <Rail
          overall={sync.context.overallPick}
          round={sync.context.round}
          pickInRound={sync.context.pickInRound}
          onClockTeamName={sync.onClockTeamName}
          isMyPick={sync.isMyPick}
          totalPicks={totalPicks}
          myRoster={myRoster}
          totalRounds={totalRounds}
          wire={wire}
          canUndo={history.length > 0}
          onUndo={handleUndo}
        />
      </main>
    </div>
  );
}

/** Calm end state — every slot is filled; review the roster and head out. */
function DraftComplete({
  league,
  myRoster,
  totalPicks,
  totalRounds,
}: {
  league: League;
  myRoster: MyRosterRow[];
  totalPicks: number;
  totalRounds: number;
}) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-5 overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Chip tone="accent" className="px-3 py-1.5">
        draft complete
      </Chip>
      <p className="font-data text-sm text-[var(--color-fg-muted)]">
        all {totalPicks} picks logged for {league.name} — the board is clear.
      </p>

      <Panel as="section" padding="none" className="w-full max-w-md">
        <PanelHeader
          title="my roster"
          right={
            <span className="stamp">
              {myRoster.length}/{totalRounds}
            </span>
          }
        />
        {myRoster.length === 0 ? (
          <p className="px-4 py-3 text-xs text-[var(--color-fg-muted)]">
            no picks were logged to your team.
          </p>
        ) : (
          <RosterList rows={myRoster} />
        )}
      </Panel>

      <div className="flex items-center gap-4">
        <EndDraftNightButton
          leagueId={league.id}
          className="font-data rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-fg-default)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        />
        {/* run it back */}
        <ResetDraftControl />
      </div>
    </div>
  );
}
