import type { BlockRegistry } from "../registry";
import { DefiniteIntegrateBlock } from "./definite-integrate/definition";
import { DerivativeBlock } from "./derivative/definition";
import { FunctionBlock } from "./function/definition";
import { GradientBlock } from "./gradient/definition";
import { IntegrateBlock } from "./integrate/definition";
import { LimitBlock } from "./limit/definition";
import { PartialBlock } from "./partial/definition";
import { SeriesBlock } from "./series/definition";
import { TaylorBlock } from "./taylor/definition";
import { VizTangentBlock } from "./viz-tangent/definition";
import { VizTaylorBlock } from "./viz-taylor/definition";

export function register(registry: BlockRegistry): void {
  registry.register(FunctionBlock);
  registry.register(DerivativeBlock);
  registry.register(IntegrateBlock);
  registry.register(DefiniteIntegrateBlock);
  registry.register(LimitBlock);
  registry.register(TaylorBlock);
  registry.register(SeriesBlock);
  registry.register(VizTaylorBlock);
  registry.register(VizTangentBlock);
  registry.register(PartialBlock);
  registry.register(GradientBlock);
}
