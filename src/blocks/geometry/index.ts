import type { BlockRegistry } from "../registry";
import { LineFromEquationBlock } from "./line-from-equation/definition";
import { LineFromPointsBlock } from "./line-from-points/definition";
import { PointBlock } from "./point/definition";

export function register(registry: BlockRegistry): void {
  registry.register(PointBlock);
  registry.register(LineFromPointsBlock);
  registry.register(LineFromEquationBlock);
}
