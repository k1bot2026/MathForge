// Reactive evaluator orchestrator.
//
// Given a GraphSpec and a BlockRegistry, walks the DAG in topological
// order, calling each block's compute() and threading results forward
// through edges. Memoization is keyed on (blockId + paramsHash +
// inputHashes); a cache miss triggers compute, a hit short-circuits.
//
// Phase 1 contract:
//   - All compute() calls are awaited even if they return synchronously.
//   - On cycle: every node in the cycle receives an EvaluationError with
//     message "Cycle detected".
//   - On unknown blockId: that single node's result is an EvaluationError.
//   - On a missing required input: the downstream node's result is an
//     EvaluationError; siblings unaffected.
//   - On thrown compute: that node's result is an EvaluationError; siblings
//     unaffected.
//   - Errors do *not* propagate transparently — a node fed by a
//     failing upstream becomes its own EvaluationError citing the upstream.

import type { BlockRegistry } from "~/blocks/registry";
import type { BlockDefinition, EvalContext, ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { buildCacheKey, EvalCache, hashInput } from "./cache";
import type { EdgeSpec, GraphSpec, NodeSpec } from "./graph-spec";
import { topoSort } from "./topo";
import type { EvalResult, EvalResults, EvaluationError } from "./types";

export type EvaluateArgs = {
  graph: GraphSpec;
  registry: BlockRegistry;
  cache?: EvalCache;
  signal?: AbortSignal;
};

export async function evaluate(args: EvaluateArgs): Promise<EvalResults> {
  const { graph, registry } = args;
  const cache = args.cache ?? new EvalCache();
  const signal = args.signal ?? new AbortController().signal;

  const sort = topoSort(graph);
  const results = new Map<string, EvalResult>();

  if (!sort.ok) {
    for (const id of sort.cycle) {
      results.set(id, errorResult(id, "Cycle detected"));
    }
    // Nodes outside the cycle still need to be processed in order, but
    // any descendant of a cycle member will see a missing upstream and
    // surface its own error. For Phase 1 we just stop here — the canvas
    // shows red on every cycle participant, which is the user-facing
    // signal we want.
    return results;
  }

  const nodeById = new Map(graph.nodes.map((n): [string, NodeSpec] => [n.id, n]));
  const ctx: EvalContext = { signal };

  for (const id of sort.order) {
    if (signal.aborted) break;
    const node = nodeById.get(id);
    if (node === undefined) continue;
    const def = registry.get(node.blockId);
    if (def === undefined) {
      results.set(id, errorResult(id, `Unknown block: ${node.blockId}`));
      continue;
    }

    const inputsResult = gatherInputs(id, def, graph.edges, results);
    if (inputsResult.kind === "error") {
      results.set(id, inputsResult);
      continue;
    }
    const inputs = inputsResult.value;
    const params: ResolvedParams = node.params;

    const inputHashes = def.inputs.map((p) => hashInput(inputs[p.id]));
    const paramsHash = hashInput(params);
    const key = buildCacheKey(def.id, paramsHash, inputHashes);
    const cached = cache.get(key);
    if (cached !== undefined) {
      results.set(id, { kind: "value", value: cached });
      continue;
    }

    try {
      const value = await Promise.resolve(def.compute(inputs, params, ctx));
      cache.set(key, value);
      results.set(id, { kind: "value", value });
    } catch (err) {
      results.set(id, errorResult(id, computeErrorMessage(err), err));
    }
  }

  return results;
}

function gatherInputs(
  id: string,
  def: BlockDefinition,
  edges: ReadonlyArray<EdgeSpec>,
  results: ReadonlyMap<string, EvalResult>,
): { kind: "value"; value: ResolvedInputs } | { kind: "error"; error: EvaluationError } {
  const inputs: Record<string, MathValue> = {};
  for (const port of def.inputs) {
    const incoming = edges.find((e) => e.target === id && (e.targetPort ?? "") === port.id);
    if (incoming === undefined) {
      if (port.required === false) continue;
      return {
        kind: "error",
        error: { nodeId: id, message: `Required input "${port.id}" is not connected` },
      };
    }
    const upstream = results.get(incoming.source);
    if (upstream === undefined || upstream.kind === "error") {
      return {
        kind: "error",
        error: {
          nodeId: id,
          message: `Upstream input "${port.id}" is not available`,
        },
      };
    }
    inputs[port.id] = upstream.value;
  }
  return { kind: "value", value: inputs };
}

function errorResult(nodeId: string, message: string, cause?: unknown): EvalResult {
  const error: EvaluationError =
    cause === undefined ? { nodeId, message } : { nodeId, message, cause };
  return { kind: "error", error };
}

function computeErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "compute() threw a non-Error value";
}
