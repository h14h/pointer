import { afterEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumericInput, type NumericIncrement } from "@/components/NumericInput";

afterEach(() => {
  cleanup();
});

describe("NumericInput", () => {
  it("renders label, units, and always-visible steppers", () => {
    render(
      <NumericInput
        label="Innings Pitched"
        units="IP"
        value={3}
        onCommit={() => {}}
        increment={0.5}
      />
    );

    expect(screen.getByText("Innings Pitched")).toBeInTheDocument();
    expect(screen.getByText("IP")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Increase value" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Decrease value" })).toBeVisible();
  });

  it("selects the full input value on focus", async () => {
    const user = userEvent.setup();
    const selectSpy = vi.spyOn(HTMLInputElement.prototype, "select");
    render(<NumericInput value={12} onCommit={() => {}} aria-label="Focus target" />);

    await user.click(screen.getByLabelText("Focus target"));

    expect(selectSpy).toHaveBeenCalled();
    selectSpy.mockRestore();
  });

  it("commits typed values on blur and Enter", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumericInput value={2} onCommit={onCommit} aria-label="Commit target" />);

    const input = screen.getByLabelText("Commit target");

    await user.click(input);
    await user.clear(input);
    await user.keyboard("7");
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenLastCalledWith(7);

    await user.click(input);
    await user.clear(input);
    await user.keyboard("9");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenLastCalledWith(9);
  });

  it("steps up and down via arrow keys and steppers", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <NumericInput value={1.5} increment={0.5} onCommit={onCommit} aria-label="Step target" />
    );

    const input = screen.getByLabelText("Step target");

    await user.click(input);
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onCommit).toHaveBeenLastCalledWith(2);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(onCommit).toHaveBeenLastCalledWith(1.5);

    await user.click(screen.getByRole("button", { name: "Increase value" }));
    expect(onCommit).toHaveBeenLastCalledWith(2);
  });

  it("reverts draft value on Escape without committing", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumericInput value={5} onCommit={onCommit} aria-label="Escape target" />);

    const input = screen.getByLabelText("Escape target") as HTMLInputElement;
    await user.click(input);
    await user.keyboard("17");
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe("5");
  });

  it("clamps values to min/max bounds", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <NumericInput value={1} min={0} max={3} onCommit={onCommit} aria-label="Clamp target" />
    );

    const input = screen.getByLabelText("Clamp target");

    await user.click(input);
    await user.clear(input);
    await user.keyboard("10");
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenLastCalledWith(3);

    await user.click(input);
    await user.clear(input);
    await user.keyboard("-4");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenLastCalledWith(0);
  });

  it("keeps steppers out of tab order", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <NumericInput value={1} onCommit={() => {}} aria-label="First numeric" />
        <NumericInput value={2} onCommit={() => {}} aria-label="Second numeric" />
      </div>
    );

    await user.tab();
    expect(screen.getByLabelText("First numeric")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Second numeric")).toHaveFocus();
  });

  it("property: committed values are bounded and aligned to increment", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -200, max: 200, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: -20, max: 0 }),
        fc.integer({ min: 0, max: 20 }),
        fc.constantFrom<NumericIncrement>(0.5, 1),
        (rawValue, min, max, increment) => {
          const onCommit = vi.fn();
          const { unmount } = render(
            <NumericInput
              value={0}
              min={min}
              max={max}
              increment={increment}
              onCommit={onCommit}
              aria-label="Property target"
            />
          );

          const input = screen.getByLabelText("Property target");
          fireEvent.change(input, { target: { value: String(rawValue) } });
          fireEvent.blur(input);

          const committed = onCommit.mock.calls.at(-1)?.[0];
          expect(committed).toBeGreaterThanOrEqual(min);
          expect(committed).toBeLessThanOrEqual(max);

          if (increment === 1) {
            expect(Number.isInteger(committed)).toBe(true);
          } else {
            const doubled = committed * 2;
            expect(Math.abs(doubled - Math.round(doubled))).toBeLessThan(1e-10);
          }

          unmount();
        }
      ),
      { numRuns: 75 }
    );
  });

  it("property: repeated commits are idempotent", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -200, max: 200, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: -20, max: 0 }),
        fc.integer({ min: 0, max: 20 }),
        fc.constantFrom<NumericIncrement>(0.5, 1),
        (rawValue, min, max, increment) => {
          const onCommit = vi.fn();
          const { unmount } = render(
            <NumericInput
              value={0}
              min={min}
              max={max}
              increment={increment}
              onCommit={onCommit}
              aria-label="Idempotence target"
            />
          );
          const input = screen.getByLabelText("Idempotence target");
          fireEvent.change(input, { target: { value: String(rawValue) } });
          fireEvent.blur(input);
          const once = onCommit.mock.calls.at(-1)?.[0];

          fireEvent.change(input, { target: { value: String(once) } });
          fireEvent.blur(input);
          const twice = onCommit.mock.calls.at(-1)?.[0];

          expect(twice).toBe(once);
          unmount();
        }
      ),
      { numRuns: 200 }
    );
  });
});
