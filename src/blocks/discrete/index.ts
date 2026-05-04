import type { BlockRegistry } from "../registry";
import { BinomialBlock } from "./binomial/definition";
import { CartesianProductBlock } from "./cartesian-product/definition";
import { DifferenceBlock } from "./difference/definition";
import { FactorialBlock } from "./factorial/definition";
import { IntersectionBlock } from "./intersection/definition";
import { MultinomialBlock } from "./multinomial/definition";
import { SetBlock } from "./set/definition";
import { UnionBlock } from "./union/definition";

export function register(registry: BlockRegistry): void {
  registry.register(SetBlock);
  registry.register(UnionBlock);
  registry.register(IntersectionBlock);
  registry.register(DifferenceBlock);
  registry.register(CartesianProductBlock);
  registry.register(FactorialBlock);
  registry.register(BinomialBlock);
  registry.register(MultinomialBlock);
}
