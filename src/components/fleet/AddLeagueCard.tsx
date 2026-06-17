"use client";

import { useState } from "react";
import { AppDialog } from "@/components/ui/AppDialog";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Input } from "@/components/ui/input";
import { useStore } from "@/store";
import type { Sport } from "@/types";

const SPORTS: { value: Sport; label: string }[] = [
  { value: "football", label: "Football" },
  { value: "baseball", label: "Baseball" },
];

/**
 * The dashed "add a league" card at the end of the league grid. Opens a small
 * printed dialog: optional name, sport choice, create. The store activates the
 * new league, so the fresh card appears in the grid on create.
 */
export function AddLeagueCard() {
  const { createLeague } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sport, setSport] = useState<Sport>("football");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setName("");
      setSport("football");
    }
  };

  const handleCreate = () => {
    createLeague(name.trim() || undefined, sport);
    handleOpenChange(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border-[1.5px] border-dashed border-[var(--color-border-default)] p-5 text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-fg-default)]"
      >
        <span className="font-data text-2xl leading-none text-[var(--color-accent)]">
          +
        </span>
        <span className="font-data text-sm tracking-[0.08em]">
          add a league
        </span>
      </button>

      <AppDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Add a league"
        description="Name it now or later. Each league keeps its own settings, projections, targets, and draft board."
        footer={
          <Button variant="primary" onClick={handleCreate}>
            Create league
          </Button>
        }
      >
        <div className="grid gap-5">
          <div className="grid gap-1.5">
            <FieldLabel>League name</FieldLabel>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleCreate();
              }}
              placeholder="My League"
              aria-label="League name"
            />
          </div>
          <div className="grid gap-1.5">
            <FieldLabel>Sport</FieldLabel>
            <div className="flex gap-2">
              {SPORTS.map((option) => (
                <Button
                  key={option.value}
                  variant={sport === option.value ? "toolbarActive" : "toolbar"}
                  size="sm"
                  onClick={() => setSport(option.value)}
                  aria-pressed={sport === option.value}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </AppDialog>
    </>
  );
}
