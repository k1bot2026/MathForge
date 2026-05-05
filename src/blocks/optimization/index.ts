import type { BlockRegistry } from "../registry";
import { BfgsBlock } from "./bfgs/definition";
import { FeasibleRegionBlock } from "./feasible-region/definition";
import { GradientDescentBlock } from "./gradient-descent/definition";
import { LagrangeBlock } from "./lagrange/definition";
import { LeastSquaresBlock } from "./least-squares/definition";
import { LineSearchBlock } from "./line-search/definition";
import { LinearRegressionBlock } from "./linear-regression/definition";
import { LpDualBlock } from "./lp-dual/definition";
import { LpStandardBlock } from "./lp-standard/definition";
import { MinimizeBlock } from "./minimize/definition";
import { NewtonOptBlock } from "./newton/definition";
import { PolynomialRegressionBlock } from "./polynomial-regression/definition";
import { BisectionBlock } from "./root-finding/bisection";
import { FixedPointBlock } from "./root-finding/fixed-point";
import { NewtonRootBlock } from "./root-finding/newton-root";
import { SecantBlock } from "./root-finding/secant";
import { SimplexBlock } from "./simplex/definition";

export function register(registry: BlockRegistry): void {
  registry.register(LpStandardBlock);
  registry.register(LpDualBlock);
  registry.register(FeasibleRegionBlock);
  registry.register(SimplexBlock);
  registry.register(GradientDescentBlock);
  registry.register(NewtonOptBlock);
  registry.register(BfgsBlock);
  registry.register(LineSearchBlock);
  registry.register(MinimizeBlock);
  registry.register(BisectionBlock);
  registry.register(NewtonRootBlock);
  registry.register(SecantBlock);
  registry.register(FixedPointBlock);
  registry.register(LinearRegressionBlock);
  registry.register(PolynomialRegressionBlock);
  registry.register(LeastSquaresBlock);
  registry.register(LagrangeBlock);
}
