import type { BlockDefinition } from "~/blocks/types";
import type { GraphSpec } from "~/engine/graph-spec";

export type SubgraphPayload = {
  inner: GraphSpec;
  inputProxies: ReadonlyArray<{ proxyNodeId: string; portId: string }>;
  outputProxies: ReadonlyArray<{ proxyNodeId: string; portId: string }>;
};

export type SubgraphDefinition = BlockDefinition & {
  subgraph: SubgraphPayload;
};
