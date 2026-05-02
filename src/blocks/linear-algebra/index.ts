// Linear-algebra domain plugin entry. Side-effect-free per the
// Phase-1 registration decision: domains expose a single
// `register(registry)` and the composition root in src/blocks/index.ts
// chooses when to call it.

import type { BlockRegistry } from "../registry";
import { AddBlock } from "./add/definition";
import { DetBlock } from "./det/definition";
import { EigenBlock } from "./eigen/definition";
import { InverseBlock } from "./inverse/definition";
import { LuBlock } from "./lu/definition";
import { MatMulBlock } from "./matmul/definition";
import { MatrixBlock } from "./matrix/definition";
import { MatVecBlock } from "./matvec/definition";
import { QrBlock } from "./qr/definition";
import { RankBlock } from "./rank/definition";
import { RrefBlock } from "./rref/definition";
import { SubBlock } from "./sub/definition";
import { TraceBlock } from "./trace/definition";
import { TransposeBlock } from "./transpose/definition";
import { UnitGridBlock } from "./unit-grid/definition";
import { VectorBlock } from "./vector/definition";

export function register(registry: BlockRegistry): void {
  registry.register(VectorBlock);
  registry.register(MatrixBlock);
  registry.register(MatVecBlock);
  registry.register(MatMulBlock);
  registry.register(TransposeBlock);
  registry.register(AddBlock);
  registry.register(SubBlock);
  registry.register(TraceBlock);
  registry.register(DetBlock);
  registry.register(EigenBlock);
  registry.register(InverseBlock);
  registry.register(LuBlock);
  registry.register(QrBlock);
  registry.register(RrefBlock);
  registry.register(RankBlock);
  registry.register(UnitGridBlock);
}
