import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";
import { PosteriorUpdateVisualization } from "./visualization";

export class PosteriorUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PosteriorUpdateError";
  }
}

export const PosteriorUpdateBlock: BlockDefinition = {
  id: "viz.posterior-update",
  label: "Posterior Update",
  symbol: "P(θ|x)",
  category: "visualizer",
  domain: "statistics",
  determinism: "pure",
  stability: "beta",
  engine: "native",
  color: "stochastic",
  inputs: [
    {
      id: "prior",
      label: "Prior (Beta)",
      type: { kind: "Distribution", family: "Beta" },
    },
    {
      id: "posterior",
      label: "Posterior (Beta)",
      type: { kind: "Distribution", family: "Beta" },
    },
  ],
  outputs: [
    {
      id: "posterior",
      label: "Posterior (Beta)",
      type: { kind: "Distribution", family: "Beta" },
    },
  ],
  compute: (inputs): MathValue => {
    const posterior = inputs.posterior;
    if (posterior === undefined) {
      throw new PosteriorUpdateError(
        "viz.posterior-update requires a posterior input — wire stats.posterior to the posterior port",
      );
    }
    const payload = posterior.payload as unknown as DistributionPayload;
    if (payload.parameters.family !== "Beta") {
      throw new PosteriorUpdateError(
        "viz.posterior-update requires a Beta posterior — use a Beta prior with stats.posterior",
      );
    }
    return posterior;
  },
  explain: {
    what: "Visualises a Bayesian prior→posterior update. Wire a Beta prior and a Beta posterior (from stats.posterior) to see both distributions overlaid on the same axis.",
    why: "Separating computation (stats.posterior) from visualisation (this block) lets the posterior be reused downstream — connect it to viz.pdf-cdf for a full CDF view.",
    effect: (inputs, output) => {
      if (inputs.prior === undefined || inputs.posterior === undefined)
        return "Connect a Beta prior and a Beta posterior.";
      const p = output.payload as unknown as DistributionPayload;
      if (p.parameters.family !== "Beta") return "Non-Beta posterior.";
      const { alpha, beta } = p.parameters;
      const mean = alpha / (alpha + beta);
      return `Posterior: Beta(${alpha.toPrecision(4)}, ${beta.toPrecision(4)}). E[θ] = ${mean.toPrecision(4)}.`;
    },
    impact: (_inputs, output) => {
      const p = output.payload as unknown as DistributionPayload;
      if (p.parameters.family !== "Beta") return "Outputs a Beta Distribution.";
      const { alpha, beta } = p.parameters;
      return `Outputs Beta(${alpha.toPrecision(4)}, ${beta.toPrecision(4)}) — connect to viz.pdf-cdf for a detailed view.`;
    },
  },
  visualization: PosteriorUpdateVisualization,
};
