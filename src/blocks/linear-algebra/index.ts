// Linear-algebra domain plugin entry. Side-effect-free per the
// Phase-1 registration decision: domains expose a single
// `register(registry)` and the composition root in src/blocks/index.ts
// chooses when to call it.

import type { BlockRegistry } from "../registry";
import { MatMulBlock } from "./matmul/definition";
import { MatrixBlock } from "./matrix/definition";
import { MatVecBlock } from "./matvec/definition";
import { UnitGridBlock } from "./unit-grid/definition";
import { VectorBlock } from "./vector/definition";

export function register(registry: BlockRegistry): void {
  registry.register(VectorBlock);
  registry.register(MatrixBlock);
  registry.register(MatVecBlock);
  registry.register(MatMulBlock);
  registry.register(UnitGridBlock);
}
