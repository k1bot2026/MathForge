// BlockDefinition runtime types.
//
// Implements the manifest interface described in docs/BLOCK_TAXONOMY.md.
// Each block is a piece of *data* (a `BlockDefinition` value) registered
// against a `BlockRegistry`; the runtime calls `definition.compute()`
// from the evaluator. Domains register their blocks via the
// side-effect-free `register(registry)` pattern (the user's Phase-1
// decision).

import type { ComponentType } from "react";
import type { MathType, MathValue } from "~/math/types";

export type BlockRole = "source" | "operation" | "visualizer" | "sink" | "control" | "composite";

export type BlockDomain =
  | "linear-algebra"
  | "statistics"
  | "calculus"
  | "discrete"
  | "optimization"
  | "common";

/** Maps to a colour family from docs/BRAND.md. */
export type ColorToken =
  | "source"
  | "operation"
  | "function"
  | "visualizer"
  | "stochastic"
  | "control";

export type ParamSpec =
  | {
      kind: "number";
      default: number;
      min?: number;
      max?: number;
      step?: number;
      label?: string;
    }
  | {
      kind: "integer";
      default: number;
      min?: number;
      max?: number;
      label?: string;
    }
  | { kind: "boolean"; default: boolean; label?: string }
  | {
      kind: "select";
      options: ReadonlyArray<string>;
      default: string;
      label?: string;
    }
  | { kind: "string"; default: string; label?: string };

export type ResolvedParams = Readonly<Record<string, unknown>>;

export type ResolvedInputs = Readonly<Record<string, MathValue>>;

export type EvalContext = {
  /** Cancellation token. compute() should observe it for long-running work. */
  signal: AbortSignal;
};

export type InputPort = {
  id: string;
  label: string;
  type: MathType;
  /** Default `true`. Optional ports may be unconnected. */
  required?: boolean;
};

/** Output port type can be polymorphic in the resolved input *types*. */
export type OutputPortType =
  | MathType
  | ((inputTypes: Readonly<Record<string, MathType>>) => MathType);

export type OutputPort = {
  id: string;
  label: string;
  type: OutputPortType;
};

export type ExplainText = string | ((inputs: ResolvedInputs) => string);

export type ExplainEffect = (inputs: ResolvedInputs, output: MathValue) => string;

export type BlockDefinition = {
  /** Stable, dotted, lowercase id. e.g. `la.matmul`, `core.constant`. */
  id: string;
  label: string;
  symbol?: string;
  category: BlockRole;
  domain: BlockDomain;
  determinism: "pure" | "stochastic" | "stateful";
  stability: "stable" | "beta" | "experimental" | "internal";
  engine: "mathjs" | "sympy" | "native";
  color: ColorToken;
  inputs: ReadonlyArray<InputPort>;
  outputs: ReadonlyArray<OutputPort>;
  params?: Readonly<Record<string, ParamSpec>>;
  compute: (
    inputs: ResolvedInputs,
    params: ResolvedParams,
    ctx: EvalContext,
  ) => Promise<MathValue> | MathValue;
  explain: {
    what: ExplainText;
    why: ExplainText;
    effect?: ExplainEffect;
    impact?: ExplainEffect;
  };
  /**
   * Optional in-node visualization. When set, BlockNode renders this
   * component instead of the textual value preview. Used for visualizer
   * blocks (viz.unit-grid, viz.histogram, …).
   */
  visualization?: ComponentType<{
    inputs: ResolvedInputs;
    output: MathValue | undefined;
  }>;
  /**
   * Optional inspector preview. When set and the node has a value result,
   * InspectorPanel renders this between the explanation tabs and the value
   * strip. Used for blocks whose output has a natural geometric rendering
   * (e.g. la.eigen eigenvector rays).
   */
  previewRenderer?: ComponentType<{
    value: MathValue;
    inputs: ResolvedInputs;
  }>;
};
