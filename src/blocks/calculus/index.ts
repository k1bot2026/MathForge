import type { BlockRegistry } from "../registry";
import { DerivativeBlock } from "./derivative/definition";
import { FunctionBlock } from "./function/definition";
import { IntegrateBlock } from "./integrate/definition";

export function register(registry: BlockRegistry): void {
  registry.register(FunctionBlock);
  registry.register(DerivativeBlock);
  registry.register(IntegrateBlock);
}
