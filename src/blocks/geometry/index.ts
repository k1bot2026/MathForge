import type { BlockRegistry } from "../registry";
import { LineFromPointsBlock } from "./line-from-points/definition";
import { PointBlock } from "./point/definition";

export function register(registry: BlockRegistry): void {
  registry.register(PointBlock);
  registry.register(LineFromPointsBlock);
}
