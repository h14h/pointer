import { LedgerRow } from "@/components/ui/LedgerRow";
import type { MyRosterRow } from "./model";

/**
 * Round-ordered "my roster" ledger — shared between the rail's MY ROSTER
 * panel and the draft-complete review screen. Keepers carry a K.
 */
export function RosterList({ rows }: { rows: MyRosterRow[] }) {
  return (
    <div className="py-1">
      {rows.map((row) => (
        <LedgerRow key={row.id}>
          <span className="font-data w-8 flex-none text-[10px] text-[var(--color-fg-subtle)]">
            {row.round !== null ? `R${row.round}` : "—"}
          </span>
          <span className="font-data min-w-0 flex-1 truncate text-xs text-[var(--color-fg-default)]">
            {row.name}
          </span>
          {row.isKeeper && (
            <span className="font-data flex-none text-[10px] font-semibold text-[var(--color-warning)]">
              K
            </span>
          )}
        </LedgerRow>
      ))}
    </div>
  );
}
