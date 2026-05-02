// Replay-mode projection of useHistoryStore: returns the graph as it
// looked at currentStep, plus the ids touched by the last applied event
// for the canvas glow effect.
//
// Memoized on the (events, currentStep) pair via useMemo so React only
// recomputes the projection when one of those changes. The projection
// pipes into the canvas in replay mode in place of useGraphStore reads.

import { useMemo } from "react";
import { useHistoryStore } from "~/store/history-store";
import { type Projection, projectGraph } from "./construction-events";

export function useGraphProjection(): Projection {
  const events = useHistoryStore((s) => s.events);
  const step = useHistoryStore((s) => s.currentStep);
  return useMemo(() => projectGraph(events, step), [events, step]);
}
