import type { League, ProjectionGroup } from "@/types";

export type DraftSpaBackup = {
  kind: "draftspa-backup";
  version: 1;
  exportedAt: string;
  leagues: League[];
  projectionGroups: ProjectionGroup[];
};

export function buildBackupPayload(args: {
  leagues: readonly League[];
  projectionGroups: readonly ProjectionGroup[];
  now?: () => Date;
}): DraftSpaBackup {
  const now = args.now ?? (() => new Date());
  return {
    kind: "draftspa-backup",
    version: 1,
    exportedAt: now().toISOString(),
    leagues: [...args.leagues],
    projectionGroups: [...args.projectionGroups],
  };
}

export function downloadBackup(backup: DraftSpaBackup) {
  if (typeof document === "undefined") return;
  const stamp = backup.exportedAt.slice(0, 10);
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `draftspa-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
