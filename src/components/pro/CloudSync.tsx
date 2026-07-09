"use client";

import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { useShallow } from "zustand/react/shallow";
import { api } from "../../../convex/_generated/api";
import {
  parseRemoteLeagueRecord,
  planCloudLeagueSync,
  serializeLeagueForCloud,
  type RemoteLeagueRecord,
} from "@/lib/cloudSync";
import { usePro } from "@/lib/pro/usePro";
import { useStore } from "@/store";

const PUSH_DEBOUNCE_MS = 1500;

/**
 * Two-way league sync for Pro users (renders nothing).
 *
 * - Pull: remote leagues newer than local replace them; unknown remote
 *   leagues are added (unless tombstoned by a local delete).
 * - Push: local leagues newer than remote are upserted, debounced. Convex
 *   broadcasts changes, so a draft tracked on a laptop updates a phone live.
 * - Delete: locally deleted league ids are removed from the cloud, then the
 *   tombstone is cleared.
 */
export function CloudSync() {
  const { isLoaded, isPro } = usePro();
  if (!isLoaded || !isPro) return null;
  return <CloudSyncInner />;
}

function CloudSyncInner() {
  const remoteLeagues = useQuery(api.leagues.list);
  const upsertLeague = useMutation(api.leagues.upsert);
  const removeLeague = useMutation(api.leagues.remove);
  const {
    leagues,
    deletedLeagueIds,
    hasHydrated,
    applyCloudLeagues,
    clearDeletedLeagueIds,
  } = useStore(
    useShallow((state) => ({
      leagues: state.leagues,
      deletedLeagueIds: state.deletedLeagueIds,
      hasHydrated: state.hasHydrated,
      applyCloudLeagues: state.applyCloudLeagues,
      clearDeletedLeagueIds: state.clearDeletedLeagueIds,
    })),
  );
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const remoteRecords = useMemo<RemoteLeagueRecord[] | undefined>(
    () =>
      remoteLeagues
        ?.map(parseRemoteLeagueRecord)
        .filter((record): record is RemoteLeagueRecord => record !== null),
    [remoteLeagues],
  );
  const syncPlan = useMemo(
    () =>
      planCloudLeagueSync({
        syncEnabled: true,
        hasHydrated,
        localLeagues: leagues,
        remoteRecords,
        tombstoneLeagueIds: deletedLeagueIds,
      }),
    [hasHydrated, leagues, remoteRecords, deletedLeagueIds],
  );

  useEffect(() => {
    if (!syncPlan.isReady) return;
    if (syncPlan.incomingLeagues.length > 0) {
      applyCloudLeagues(syncPlan.incomingLeagues);
    }
  }, [syncPlan, applyCloudLeagues]);

  // Push local changes to the cloud (debounced)
  useEffect(() => {
    if (!syncPlan.isReady) return;
    if (syncPlan.tombstoneIdsToClear.length > 0) {
      clearDeletedLeagueIds(syncPlan.tombstoneIdsToClear);
    }
    if (syncPlan.leaguesToUpsert.length === 0 && syncPlan.leagueIdsToRemove.length === 0) return;

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      for (const league of syncPlan.leaguesToUpsert) {
        void upsertLeague(serializeLeagueForCloud(league));
      }
      for (const id of syncPlan.leagueIdsToRemove) {
        void removeLeague({ leagueId: id });
      }
    }, PUSH_DEBOUNCE_MS);

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [
    syncPlan,
    upsertLeague,
    removeLeague,
    clearDeletedLeagueIds,
  ]);

  return null;
}
