// Statistics domain plugin entry. Side-effect-free per the registration
// decision: domains expose a single `register(registry)` and the composition
// root in src/blocks/index.ts chooses when to call it.

import type { BlockRegistry } from "../registry";
import { BernoulliBlock } from "./bernoulli/definition";
import { BetaBlock } from "./beta/definition";
import { BinomialBlock } from "./binomial/definition";
import { CorBlock } from "./cor/definition";
import { CovBlock } from "./cov/definition";
import { EmpiricalBlock } from "./empirical/definition";
import { ExpectBlock } from "./expect/definition";
import { GammaBlock } from "./gamma/definition";
import { HistogramBlock } from "./histogram/definition";
import { JointHeatmapBlock } from "./joint-heatmap/definition";
import { NormalBlock } from "./normal/definition";
import { PdfCdfBlock } from "./pdf-cdf/definition";
import { PoissonBlock } from "./poisson/definition";
import { SampleBlock } from "./sample/definition";
import { UniformBlock } from "./uniform/definition";
import { VarBlock } from "./var/definition";

export function register(registry: BlockRegistry): void {
  registry.register(BernoulliBlock);
  registry.register(BetaBlock);
  registry.register(BinomialBlock);
  registry.register(CorBlock);
  registry.register(CovBlock);
  registry.register(EmpiricalBlock);
  registry.register(ExpectBlock);
  registry.register(GammaBlock);
  registry.register(HistogramBlock);
  registry.register(JointHeatmapBlock);
  registry.register(NormalBlock);
  registry.register(PdfCdfBlock);
  registry.register(PoissonBlock);
  registry.register(SampleBlock);
  registry.register(UniformBlock);
  registry.register(VarBlock);
}
