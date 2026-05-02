import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PanelState } from "./panel-state";
import { StateChip } from "./state-chip";

describe("<StateChip />", () => {
  const cases: Array<[PanelState, RegExp]> = [
    ["computing", /computing/i],
    ["value", /value/i],
    ["warn", /precision loss/i],
    ["error", /type mismatch/i],
    ["unknown", /unregistered/i],
  ];
  it.each(cases)("renders %s state with the right label", (state, label) => {
    render(<StateChip state={state} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it.each(cases)("tags with data-testid for state %s", (state) => {
    render(<StateChip state={state} />);
    expect(screen.getByTestId(`state-chip-${state}`)).toBeInTheDocument();
  });
});
