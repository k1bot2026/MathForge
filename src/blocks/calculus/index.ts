import type { BlockRegistry } from "../registry";
import { FunctionBlock } from "./function/definition";

export function register(registry: BlockRegistry): void {
  registry.register(FunctionBlock);
}
