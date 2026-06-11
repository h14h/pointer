import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AppDialog } from "@/components/ui/AppDialog";
import { AppSheet } from "@/components/ui/AppSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dropdown } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/input";
import { LedgerRow } from "@/components/ui/LedgerRow";
import { PanelHeader } from "@/components/ui/Panel";

describe("shared ui primitives", () => {
  it("renders button variants with accessible button semantics", () => {
    render(
      <>
        <Button variant="primary">Save</Button>
        <Button variant="destructive">Delete</Button>
        <Button variant="toolbar">Filter</Button>
      </>
    );

    expect(screen.getByRole("button", { name: "Save" }).className).toContain(
      "bg-[var(--color-accent)]"
    );
    expect(screen.getByRole("button", { name: "Delete" }).className).toContain(
      "bg-[var(--color-danger)]"
    );
    expect(screen.getByRole("button", { name: "Filter" }).className).toContain(
      "border-[var(--color-border-default)]"
    );
  });

  it("renders input tones and badge variants", () => {
    render(
      <>
        <Input aria-label="Search" tone="subtle" />
        <Badge variant="accent">Active</Badge>
      </>
    );

    expect(screen.getByRole("textbox", { name: "Search" }).className).toContain(
      "bg-[var(--color-surface-muted)]"
    );
    expect(screen.getByText("Active").className).toContain("text-[var(--color-accent)]");
  });

  it("renders the chip tones and ledger row idioms", () => {
    render(
      <>
        <Chip>Baseball</Chip>
        <Chip tone="warning">draft in progress</Chip>
        <LedgerRow>
          <span>R1</span>
          <span>Bijan Robinson</span>
        </LedgerRow>
        <PanelHeader title="sync check" right={<span>r3.04</span>} />
      </>
    );

    expect(screen.getByText("Baseball").className).toContain("rounded-[var(--radius-sm)]");
    expect(screen.getByText("draft in progress").className).toContain(
      "text-[var(--color-warning)]"
    );
    expect(screen.getByText("Bijan Robinson").parentElement?.className).toContain("border-b");
    expect(screen.getByText("sync check")).toBeInTheDocument();
    expect(screen.getByText("r3.04")).toBeInTheDocument();
  });

  it("renders multi-select count badge with correct value", () => {
    cleanup();
    const onChange = vi.fn();

    render(
      <Dropdown
        mode="multi"
        values={["C", "SS"]}
        onChange={onChange}
        triggerLabel="Position"
        menuLabel="Filter by Position"
        clearLabel="Clear"
        options={[
          { value: "C", label: "C" },
          { value: "1B", label: "1B" },
          { value: "SS", label: "SS" },
        ]}
      />
    );

    const trigger = screen.getByRole("button", { name: /position/i });
    expect(trigger).toHaveTextContent("2");

    const badge = trigger.querySelector(
      '[aria-hidden="true"].flex.h-4.w-4.items-center.justify-center'
    );
    expect(badge).not.toBeNull();
    expect(badge).toHaveTextContent("2");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "1B" }));
    expect(onChange).toHaveBeenCalledWith(["C", "SS", "1B"]);
  });

  it("hides multi-select badge when selection is empty", () => {
    cleanup();
    const onChange = vi.fn();

    const { rerender } = render(
      <Dropdown
        mode="multi"
        values={["C", "SS"]}
        onChange={onChange}
        triggerLabel="Position"
        menuLabel="Filter by Position"
        clearLabel="Clear"
        options={[
          { value: "C", label: "C" },
          { value: "1B", label: "1B" },
          { value: "SS", label: "SS" },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /position/i }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith([]);

    // Simulate parent updating values to empty — badge should be hidden
    rerender(
      <Dropdown
        mode="multi"
        values={[]}
        onChange={onChange}
        triggerLabel="Position"
        menuLabel="Filter by Position"
        clearLabel="Clear"
        options={[
          { value: "C", label: "C" },
          { value: "1B", label: "1B" },
          { value: "SS", label: "SS" },
        ]}
      />
    );

    expect(
      screen
        .getByRole("button", { name: /position/i })
        .querySelector('[aria-hidden="true"].flex.h-4.w-4.items-center.justify-center')
    ).toBeNull();
  });

  it("renders dropdown with an optional label and custom content", () => {
    cleanup();
    const onOpenChange = vi.fn();

    const { rerender, container } = render(
      <Dropdown
        label="Projection"
        triggerValue="2025 Leaders"
        open={false}
        onOpenChange={onOpenChange}
        fullWidth
      >
        <div>Menu body</div>
      </Dropdown>
    );

    const labelledTrigger = within(container).getByRole("button");
    expect(labelledTrigger).toHaveTextContent("Projection");
    expect(labelledTrigger).toHaveTextContent("2025 Leaders");
    expect(labelledTrigger.className).toContain("rounded-full");
    expect(labelledTrigger.className).toContain("border-[var(--color-border-soft)]");
    fireEvent.click(labelledTrigger);
    expect(onOpenChange).toHaveBeenCalledWith(true);

    rerender(
      <Dropdown
        triggerValue="My League"
        open={true}
        onOpenChange={onOpenChange}
      >
        <div>Menu body</div>
      </Dropdown>
    );

    expect(within(container).getByText("My League").closest("button")).not.toBeNull();
    expect(within(container).getByText("Menu body")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close dropdown" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders data-driven dropdown with consistent pill styling", () => {
    cleanup();
    const onChange = vi.fn();

    render(
      <Dropdown
        value="batters"
        onChange={onChange}
        ariaLabel="Player type"
        options={[
          { value: "all", label: "All Players" },
          { value: "batters", label: "Batters" },
          { value: "pitchers", label: "Pitchers" },
        ]}
      />
    );

    const trigger = screen.getByRole("button", { name: "Player type" });
    expect(trigger).toHaveTextContent("Batters");
    expect(trigger.className).toContain("rounded-full");
    expect(trigger.className).toContain("border-[var(--color-border-soft)]");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "All Players" }));
    expect(onChange).toHaveBeenCalledWith("all");
  });

  it("renders dropdown with description and footer", () => {
    cleanup();
    const onChange = vi.fn();

    render(
      <Dropdown
        value="a"
        onChange={onChange}
        options={[
          { value: "a", label: "Option A", description: "First option" },
          { value: "b", label: "Option B", description: "Second option" },
        ]}
        footer={<a href="/manage">Manage...</a>}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /option a/i }));
    expect(screen.getByText("First option")).toBeInTheDocument();
    expect(screen.getByText("Manage...")).toBeInTheDocument();
  });

  it("renders app dialog and sheet shells", () => {
    render(
      <>
        <AppDialog open={true} onOpenChange={vi.fn()} title="Upload">
          <div>Dialog body</div>
        </AppDialog>
        <AppSheet open={true} onOpenChange={vi.fn()} title="Menu">
          <div>Sheet body</div>
        </AppSheet>
      </>
    );

    expect(screen.getByText("Dialog body")).toBeInTheDocument();
    expect(screen.getByText("Sheet body")).toBeInTheDocument();
    expect(screen.getAllByText("draftspa").length).toBeGreaterThan(0);
  });
});
