import type { BlockRegistry } from "../registry";
import { PointBlock } from "./point/definition";

export function register(registry: BlockRegistry): void {
  registry.register(PointBlock);
}
