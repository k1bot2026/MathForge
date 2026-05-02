// In-memory log of ConstructionEvents driving the replay timeline.
//
// Separate from useGraphStore so replay state can be cleared / reset
// without touching the canvas graph. Persistence is intentionally
// session-only: the URL hash continues to encode only the current
// snapshot, not the full construction history. See
// docs/plans/2026-05-02-construction-protocol-design.md.

import { create } from "zustand";
import type { ConstructionEvent } from "~/engine/construction-events";

export type HistoryMode = "edit" | "replay";

export type HistoryState = {
  events: ConstructionEvent[];
  /** Index in [0, events.length]. events.slice(0, currentStep) is the
   *  projected graph state. */
  currentStep: number;
  mode: HistoryMode;
  playing: boolean;
  pushEvent: (e: ConstructionEvent) => void;
  setEvents: (events: ConstructionEvent[]) => void;
  setCurrentStep: (n: number) => void;
  setMode: (mode: HistoryMode) => void;
  setPlaying: (playing: boolean) => void;
  reset: () => void;
};

const clamp = (n: number, max: number): number => Math.max(0, Math.min(n, max));

export const useHistoryStore = create<HistoryState>((set) => ({
  events: [],
  currentStep: 0,
  mode: "edit",
  playing: false,
  pushEvent: (e) =>
    set((s) => {
      const events = [...s.events, e];
      return s.mode === "edit" ? { events, currentStep: events.length } : { events };
    }),
  setEvents: (events) => {
    set({ events, currentStep: events.length });
  },
  setCurrentStep: (n) => {
    set((s) => ({ currentStep: clamp(n, s.events.length) }));
  },
  setMode: (mode) =>
    set((s) =>
      mode === "replay"
        ? { mode, currentStep: 0, playing: false }
        : { mode, currentStep: s.events.length, playing: false },
    ),
  setPlaying: (playing) => {
    set({ playing });
  },
  reset: () => {
    set({ events: [], currentStep: 0, mode: "edit", playing: false });
  },
}));
