import type { BlockRegistry } from "../registry";
import { DerivativeBlock } from "./derivative/definition";
import { FunctionBlock } from "./function/definition";

export function register(registry: BlockRegistry): void {
  registry.register(FunctionBlock);
  registry.register(DerivativeBlock);
}
