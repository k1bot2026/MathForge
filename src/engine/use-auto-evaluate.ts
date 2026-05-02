"use client";

// Subscribes to graph-store node/edge changes and reruns the evaluator
// against the project-wide block registry. Results land back on the
// store so block components can reflect them. Only one in-flight run is
// allowed at a time — overlapping triggers cancel via AbortController.
//
// The subscription explicitly compares only `nodes` and `edges` so the
// `setResults` write the hook itself emits doesn't loop back into a
// new evaluation.

import { useEffect } from "react";
import { blockRegistry } from "~/blocks";
import { useGraphStore } from "~/store/graph-store";
import { EvalCache } from "./cache";
import { evaluate } from "./evaluator";
import { toGraphSpec } from "./graph-spec";

const sharedCache = new EvalCache();

export function useAutoEvaluate(): void {
  useEffect(() => {
    let inflight: AbortController | null = null;

    async function run(): Promise<void> {
      inflight?.abort();
      const ctrl = new AbortController();
      inflight = ctrl;
      const { nodes, edges, setResults, setEvalStatus } = useGraphStore.getState();
      setEvalStatus("running");
      try {
        const results = await evaluate({
          graph: toGraphSpec(nodes, edges),
          registry: blockRegistry,
          cache: sharedCache,
          signal: ctrl.signal,
        });
        if (!ctrl.signal.aborted) setResults(results);
      } finally {
        if (inflight === ctrl) {
          setEvalStatus("idle");
          inflight = null;
        }
      }
    }

    void run();

    const unsubscribe = useGraphStore.subscribe((state, prev) => {
      if (state.nodes !== prev.nodes || state.edges !== prev.edges) {
        void run();
      }
    });

    return () => {
      inflight?.abort();
      unsubscribe();
    };
  }, []);
}
