import type { BlockRegistry } from "../registry";
import { SetBlock } from "./set/definition";

export function register(registry: BlockRegistry): void {
  registry.register(SetBlock);
}
