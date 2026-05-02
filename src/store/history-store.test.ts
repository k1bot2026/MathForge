import { beforeEach, describe, expect, it } from "vitest";
import type { ConstructionEvent } from "~/engine/construction-events";
import { useHistoryStore } from "./history-store";

const seedEvent = (id = "a"): ConstructionEvent => ({
  kind: "node-added",
  node: { id, type: "block", position: { x: 0, y: 0 }, data: {} },
  at: 0,
});

beforeEach(() => useHistoryStore.getState().reset());

describe("useHistoryStore", () => {
  it("starts empty", () => {
    const s = useHistoryStore.getState();
    expect(s.events).toEqual([]);
    expect(s.currentStep).toBe(0);
    expect(s.mode).toBe("edit");
    expect(s.playing).toBe(false);
  });

  it("pushEvent appends and advances currentStep when in edit mode", () => {
    useHistoryStore.getState().pushEvent(seedEvent());
    const s = useHistoryStore.getState();
    expect(s.events).toHaveLength(1);
    expect(s.currentStep).toBe(1);
  });

  it("pushEvent appends but does not advance currentStep in replay mode", () => {
    useHistoryStore.getState().setMode("replay");
    useHistoryStore.getState().pushEvent(seedEvent());
    expect(useHistoryStore.getState().currentStep).toBe(0);
  });

  it("setCurrentStep clamps to [0, events.length]", () => {
    useHistoryStore.getState().pushEvent(seedEvent());
    useHistoryStore.getState().setCurrentStep(99);
    expect(useHistoryStore.getState().currentStep).toBe(1);
    useHistoryStore.getState().setCurrentStep(-3);
    expect(useHistoryStore.getState().currentStep).toBe(0);
  });

  it("setMode('replay') resets currentStep to 0 and clears playing", () => {
    useHistoryStore.getState().pushEvent(seedEvent("a"));
    useHistoryStore.getState().pushEvent(seedEvent("b"));
    useHistoryStore.getState().setPlaying(true);
    useHistoryStore.getState().setMode("replay");
    expect(useHistoryStore.getState().currentStep).toBe(0);
    expect(useHistoryStore.getState().playing).toBe(false);
  });

  it("setMode('edit') jumps currentStep to events.length", () => {
    useHistoryStore.getState().pushEvent(seedEvent());
    useHistoryStore.getState().setMode("replay");
    useHistoryStore.getState().setMode("edit");
    expect(useHistoryStore.getState().currentStep).toBe(1);
  });

  it("setEvents replaces the log atomically", () => {
    const e1 = seedEvent("a");
    const e2: ConstructionEvent = { kind: "graph-reset", reason: "template", at: 1 };
    useHistoryStore.getState().setEvents([e1, e2]);
    const s = useHistoryStore.getState();
    expect(s.events).toEqual([e1, e2]);
    expect(s.currentStep).toBe(2);
  });

  it("reset returns the store to its initial state", () => {
    useHistoryStore.getState().pushEvent(seedEvent());
    useHistoryStore.getState().setMode("replay");
    useHistoryStore.getState().setPlaying(true);
    useHistoryStore.getState().reset();
    const s = useHistoryStore.getState();
    expect(s).toMatchObject({ events: [], currentStep: 0, mode: "edit", playing: false });
  });
});
