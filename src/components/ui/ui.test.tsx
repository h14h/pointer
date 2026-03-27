import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Button } from "@/components/ui/Button";
import { DialogShell } from "@/components/ui/DialogShell";
import { MenuSelect } from "@/components/ui/MenuSelect";
import { PillDropdown } from "@/components/ui/PillDropdown";

describe("shared ui primitives", () => {
  it("renders button variants with accessible button semantics", () => {
    render(
      <>
        <Button variant="primary">Save</Button>
        <Button variant="destructive">Delete</Button>
      </>
    );

    expect(screen.getByRole("button", { name: "Save" }).className).toContain(
      "bg-[var(--color-accent)]"
    );
    expect(screen.getByRole("button", { name: "Delete" }).className).toContain(
      "bg-[var(--color-danger)]"
    );
  });

  it("closes dialog via the shared close button", () => {
    const onClose = vi.fn();

    render(
      <DialogShell
        title="Delete all projections?"
        description="This cannot be undone."
        labelledBy="dialog-delete"
        closeLabel="Close delete dialog"
        onClose={onClose}
        footer={<Button variant="destructive">Delete</Button>}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Close delete dialog" }));

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby", "dialog-delete");
    expect(onClose).toHaveBeenCalled();
  });

  it("supports multi-select mode with count badge and clear action", () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <MenuSelect
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

    expect(screen.getByRole("button", { name: /position/i })).toHaveTextContent("2");
    expect(
      screen
        .getByRole("button", { name: /position/i })
        .querySelector('[aria-hidden="true"].flex.h-4.w-4.items-center.justify-center')
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /position/i }));
    fireEvent.click(screen.getByRole("button", { name: "1B" }));
    expect(onChange).toHaveBeenCalledWith(["C", "SS", "1B"]);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith([]);

    rerender(
      <MenuSelect
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
    ).not.toBeNull();
  });

  it("renders pill dropdowns with an optional label", () => {
    const onToggle = vi.fn();
    const onClose = vi.fn();

    const { rerender, container } = render(
      <PillDropdown
        label="Projection"
        value="2025 Leaders"
        menu={<div>Menu body</div>}
        isOpen={false}
        onToggle={onToggle}
        onClose={onClose}
        fullWidth
      />
    );

    const labelledTrigger = within(container).getByRole("button");
    expect(labelledTrigger).toHaveTextContent("Projection");
    expect(labelledTrigger).toHaveTextContent("2025 Leaders");
    fireEvent.click(labelledTrigger);
    expect(onToggle).toHaveBeenCalled();

    rerender(
      <PillDropdown
        value="My League"
        menu={<div>Menu body</div>}
        isOpen={true}
        onToggle={onToggle}
        onClose={onClose}
      />
    );

    expect(within(container).getByText("My League").closest("button")).not.toBeNull();
    expect(within(container).getByText("Menu body")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close dropdown" }));
    expect(onClose).toHaveBeenCalled();
  });
});
