import type { BlockRegistry } from "../registry";
import { CartesianProductBlock } from "./cartesian-product/definition";
import { DifferenceBlock } from "./difference/definition";
import { IntersectionBlock } from "./intersection/definition";
import { SetBlock } from "./set/definition";
import { UnionBlock } from "./union/definition";

export function register(registry: BlockRegistry): void {
  registry.register(SetBlock);
  registry.register(UnionBlock);
  registry.register(IntersectionBlock);
  registry.register(DifferenceBlock);
  registry.register(CartesianProductBlock);
}
