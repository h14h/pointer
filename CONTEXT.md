# DraftSpa

DraftSpa is a local-first fantasy draft workspace. Users manage leagues,
projection groups, scoring, and draft state locally, with optional paid cloud
backup and account sync.

## Language

**Local workspace**: The user's browser-resident DraftSpa data, including
leagues and draft state, which remains primary even after sign-in. _Avoid_:
Client cache, offline copy

**Cloud backup**: The paid account-linked copy of syncable DraftSpa data used
for recovery and multi-device continuity. _Avoid_: Source of truth, cloud
workspace

**Cloud League sync**: The reconciliation of local league data with
account-linked cloud records while preserving the local workspace as primary.
_Avoid_: Cloud takeover, server authority

**Local projection source**: A projection source available inside the local
workspace, including user uploads and built-in baselines, that is not copied by
Cloud League sync. _Avoid_: Synced projection, cloud projection

**Premium projection source**: An account-gated projection source provided by
DraftSpa for paid users, distinct from user-uploaded local projection sources
and distinct from Cloud League sync. _Avoid_: Synced projection, backup
projection

**Soft projection reference**: A league's remembered pointer to a projection
source that may not be available in the current local workspace. _Avoid_:
Required projection, synced projection

**Live draft sync**: The draft-night propagation of picks and draft state across
a user's devices, where action order matters more than backup freshness.
_Avoid_: Cloud backup, last saved league

**Sync conflict**: Two independently changed versions of the same league data
that Cloud League sync must reconcile. _Avoid_: Save race, cloud overwrite

**Tombstone**: A locally remembered deletion that prevents Cloud League sync
from resurrecting a league removed from the local workspace. _Avoid_: Soft
delete, archive
