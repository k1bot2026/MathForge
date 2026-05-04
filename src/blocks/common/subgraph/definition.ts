import type { BlockRegistry } from "~/blocks/registry";
import type { EvalContext, InputPort, OutputPort } from "~/blocks/types";
import { EvalCache } from "~/engine/cache";
import { evaluate } from "~/engine/evaluator";
import type { MathValue } from "~/math/types";
import type { SubgraphDefinition, SubgraphPayload } from "./types";

export const MAX_SUBGRAPH_DEPTH = 8;

export class SubgraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubgraphError";
  }
}

/**
 * Creates a core.subgraph BlockDefinition from a payload.
 * The registry is captured in the closure so the sub-evaluator can
 * resolve inner block ids using the same set as the outer graph.
 */
export function buildSubgraphDefinition(
  id: string,
  label: string,
  payload: SubgraphPayload,
  inputPorts: ReadonlyArray<InputPort>,
  outputPorts: ReadonlyArray<OutputPort>,
  registry: BlockRegistry,
): SubgraphDefinition {
  return {
    id,
    label,
    symbol: "⊞",
    category: "composite",
    domain: "common",
    determinism: "pure",
    stability: "experimental",
    engine: "native",
    color: "control",
    inputs: inputPorts,
    outputs: outputPorts,
    subgraph: payload,

    compute(inputs, _params, ctx: EvalContext): Promise<MathValue> {
      const depth = ctx.depth ?? 0;
      if (depth > MAX_SUBGRAPH_DEPTH) {
        return Promise.reject(new SubgraphError("Max subgraph nesting depth exceeded"));
      }

      const seeded = new Map<string, { kind: "value"; value: MathValue }>();
      for (const proxy of payload.inputProxies) {
        const v = inputs[proxy.portId];
        if (v !== undefined) {
          seeded.set(proxy.proxyNodeId, { kind: "value", value: v });
        }
      }

      return evaluate({
        graph: payload.inner,
        registry,
        cache: new EvalCache(),
        signal: ctx.signal,
        initialResults: seeded,
        depth: depth + 1,
      }).then((subResults) => {
        if (outputPorts.length === 1) {
          const proxy = payload.outputProxies[0];
          if (proxy === undefined) {
            throw new SubgraphError("No output proxy configured");
          }
          const result = subResults.get(proxy.proxyNodeId);
          if (result === undefined || result.kind === "error") {
            throw new SubgraphError(
              result?.kind === "error"
                ? result.error.message
                : `Output proxy ${proxy.proxyNodeId} did not produce a value`,
            );
          }
          return result.value;
        }

        // Multi-output: return value from first output proxy (named ports preferred).
        const firstProxy = payload.outputProxies[0];
        if (firstProxy === undefined) {
          throw new SubgraphError("Subgraph has no output proxy");
        }
        const firstResult = subResults.get(firstProxy.proxyNodeId);
        if (firstResult === undefined || firstResult.kind === "error") {
          throw new SubgraphError(
            firstResult?.kind === "error"
              ? firstResult.error.message
              : `Output proxy ${firstProxy.proxyNodeId} did not produce a value`,
          );
        }
        return firstResult.value;
      });
    },

    explain: {
      what: `Composite block: ${label}`,
      why: "Encapsulates a reusable inner graph behind a named I/O surface.",
      effect: () => `Subgraph ${label} — evaluates inner graph and exposes named output ports.`,
    },
  };
}
