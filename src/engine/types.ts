// Evaluator-side types — what comes out of `evaluate()` and how errors
// are surfaced.

import type { MathValue } from "~/math/types";

export type EvaluationError = {
  /** Graph-node id (not block id) where the error originated. */
  nodeId: string;
  /** End-user message — single sentence, suitable for the node's red-bordered tooltip. */
  message: string;
  /** Original thrown value, if any. */
  cause?: unknown;
};

export type EvalResult =
  | { kind: "value"; value: MathValue }
  | { kind: "error"; error: EvaluationError };

export type EvalResults = ReadonlyMap<string, EvalResult>;
