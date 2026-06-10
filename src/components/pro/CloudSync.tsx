"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { useShallow } from "zustand/react/shallow";
import { api } from "../../../convex/_generated/api";
import { usePro } from "@/lib/pro/usePro";
import { useStore } from "@/store";
import type { League } from "@/types";

const PUSH_DEBOUNCE_MS = 1500;

function parseRemoteLeague(data: string): League | null {
  try {
    const parsed = JSON.parse(data) as League;
    if (!parsed || typeof parsed.id !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

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

  // Pull remote changes into the local store
  useEffect(() => {
    if (!hasHydrated || !remoteLeagues) return;
    const localById = new Map(leagues.map((league) => [league.id, league]));
    const incoming = remoteLeagues
      .map((record) => parseRemoteLeague(record.data))
      .filter((league): league is League => league !== null)
      .filter((league) => {
        if (deletedLeagueIds.includes(league.id)) return false;
        const local = localById.get(league.id);
        return !local || league.updatedAt > (local.updatedAt ?? 0);
      });
    if (incoming.length > 0) {
      applyCloudLeagues(incoming);
    }
  }, [remoteLeagues, hasHydrated, leagues, deletedLeagueIds, applyCloudLeagues]);

  // Push local changes to the cloud (debounced)
  useEffect(() => {
    if (!hasHydrated || !remoteLeagues) return;

    const remoteUpdatedAtById = new Map(
      remoteLeagues.map((record) => [record.leagueId, record.updatedAt]),
    );
    const staleLeagues = leagues.filter(
      (league) => (remoteUpdatedAtById.get(league.id) ?? 0) < (league.updatedAt ?? 0),
    );
    const cloudDeletions = deletedLeagueIds.filter((id) => remoteUpdatedAtById.has(id));
    const resolvedTombstones = deletedLeagueIds.filter((id) => !remoteUpdatedAtById.has(id));

    if (resolvedTombstones.length > 0) {
      clearDeletedLeagueIds(resolvedTombstones);
    }
    if (staleLeagues.length === 0 && cloudDeletions.length === 0) return;

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      for (const league of staleLeagues) {
        void upsertLeague({
          leagueId: league.id,
          name: league.name,
          sport: league.sport ?? "baseball",
          data: JSON.stringify(league),
          updatedAt: league.updatedAt ?? Date.now(),
        });
      }
      for (const id of cloudDeletions) {
        void removeLeague({ leagueId: id });
      }
    }, PUSH_DEBOUNCE_MS);

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [
    leagues,
    remoteLeagues,
    deletedLeagueIds,
    hasHydrated,
    upsertLeague,
    removeLeague,
    clearDeletedLeagueIds,
  ]);

  return null;
}
