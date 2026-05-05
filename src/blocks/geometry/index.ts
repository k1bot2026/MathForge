import type { BlockRegistry } from "../registry";
import { CircleFromCenterRadiusBlock } from "./circle-from-center-radius/definition";
import { CircleFromThreePointsBlock } from "./circle-from-three-points/definition";
import { ConicFromFivePointsBlock } from "./conic-from-five-points/definition";
import { LineFromEquationBlock } from "./line-from-equation/definition";
import { LineFromPointsBlock } from "./line-from-points/definition";
import { MidpointBlock } from "./midpoint/definition";
import { PointBlock } from "./point/definition";
import { PolygonBlock } from "./polygon/definition";
import { RegularPolygonBlock } from "./regular-polygon/definition";

export function register(registry: BlockRegistry): void {
  registry.register(PointBlock);
  registry.register(LineFromPointsBlock);
  registry.register(LineFromEquationBlock);
  registry.register(CircleFromCenterRadiusBlock);
  registry.register(CircleFromThreePointsBlock);
  registry.register(PolygonBlock);
  registry.register(RegularPolygonBlock);
  registry.register(ConicFromFivePointsBlock);
  registry.register(MidpointBlock);
}
