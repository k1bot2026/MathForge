import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConstructionEvent } from "~/engine/construction-events";
import { useHistoryStore } from "~/store/history-store";
import { ReplayBar } from "./replay-bar";

const seedEvents: ConstructionEvent[] = [
  {
    kind: "node-added",
    node: { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
    at: 0,
  },
  {
    kind: "node-added",
    node: { id: "b", type: "block", position: { x: 0, y: 0 }, data: {} },
    at: 1,
  },
  { kind: "edge-added", edge: { id: "e", source: "a", target: "b" }, at: 2 },
];

beforeEach(() => {
  useHistoryStore.getState().reset();
  useHistoryStore.getState().setEvents(seedEvents);
  useHistoryStore.getState().setMode("replay");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("<ReplayBar />", () => {
  it("renders step label for the current step", () => {
    render(<ReplayBar />);
    expect(screen.getByText(/step\s+0\s*\/\s*3/i)).toBeInTheDocument();
  });

  it("scrubber input updates currentStep", () => {
    render(<ReplayBar />);
    const scrubber = screen.getByRole("slider");
    fireEvent.change(scrubber, { target: { value: "2" } });
    expect(useHistoryStore.getState().currentStep).toBe(2);
  });

  it("clicking play sets playing=true and advances on the 400 ms tick", () => {
    vi.useFakeTimers();
    render(<ReplayBar />);
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    expect(useHistoryStore.getState().playing).toBe(true);
    vi.advanceTimersByTime(400);
    expect(useHistoryStore.getState().currentStep).toBe(1);
    vi.advanceTimersByTime(400);
    expect(useHistoryStore.getState().currentStep).toBe(2);
  });

  it("auto-pauses when reaching the end of the log", () => {
    vi.useFakeTimers();
    useHistoryStore.getState().setCurrentStep(3);
    render(<ReplayBar />);
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    vi.advanceTimersByTime(400);
    expect(useHistoryStore.getState().playing).toBe(false);
  });
});
