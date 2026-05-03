import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import {
  makeStubProps,
  provenance,
  ResultPrimer,
  StoryFrame,
} from "~/editor/nodes/block-node-story-utils";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/statistics/Posterior",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

function betaValue(alpha: number, beta: number): MathValue {
  const payload: DistributionPayload = {
    parameters: { family: "Beta", alpha, beta },
    moments: {
      mean: alpha / (alpha + beta),
      variance: (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1)),
    },
    support: { kind: "continuous", lo: 0, hi: 1 },
  };
  return {
    type: { kind: "Distribution", family: "Beta" },
    payload: payload as unknown as number,
    provenance: provenance("stats.beta"),
  };
}

function bernoulliValue(): MathValue {
  const payload: DistributionPayload = {
    parameters: { family: "Bernoulli", p: 0.5 },
    moments: { mean: 0.5, variance: 0.25 },
    support: { kind: "discrete", values: [0, 1] },
  };
  return {
    type: { kind: "Distribution", family: "Bernoulli" },
    payload: payload as unknown as number,
    provenance: provenance("stats.bernoulli"),
  };
}

function normalValue(mu: number, sigma: number): MathValue {
  const payload: DistributionPayload = {
    parameters: { family: "Normal", mu, sigma },
    moments: { mean: mu, variance: sigma ** 2 },
    support: { kind: "continuous", lo: -Infinity, hi: Infinity },
  };
  return {
    type: { kind: "Distribution", family: "Normal" },
    payload: payload as unknown as number,
    provenance: provenance("stats.normal"),
  };
}

function gammaValue(alpha: number, beta: number): MathValue {
  const payload: DistributionPayload = {
    parameters: { family: "Gamma", alpha, beta },
    moments: { mean: alpha / beta, variance: alpha / beta ** 2 },
    support: { kind: "continuous", lo: 0, hi: Infinity },
  };
  return {
    type: { kind: "Distribution", family: "Gamma" },
    payload: payload as unknown as number,
    provenance: provenance("stats.gamma"),
  };
}

function poissonValue(): MathValue {
  const payload: DistributionPayload = {
    parameters: { family: "Poisson", lambda: 2 },
    moments: { mean: 2, variance: 2 },
    support: { kind: "discrete", values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  };
  return {
    type: { kind: "Distribution", family: "Poisson" },
    payload: payload as unknown as number,
    provenance: provenance("stats.poisson"),
  };
}

function story(
  id: string,
  prior: MathValue,
  likelihood: MathValue,
  params?: Record<string, unknown>,
): Story {
  return {
    render: (args) => (
      <>
        <ResultPrimer
          results={[
            { id: "story-prior", result: { kind: "value", value: prior } },
            { id: "story-likelihood", result: { kind: "value", value: likelihood } },
          ]}
          upstreamEdges={[
            {
              id: "edge-prior",
              source: "story-prior",
              target: (args as { id: string }).id,
              sourceHandle: "prior",
              targetHandle: "prior",
            },
            {
              id: "edge-likelihood",
              source: "story-likelihood",
              target: (args as { id: string }).id,
              sourceHandle: "likelihood",
              targetHandle: "likelihood",
            },
          ]}
        />
        <BlockNode {...args} />
      </>
    ),
    args: makeStubProps(id, "stats.posterior", params ?? { n_obs: 10, k_hits: 7 }),
  };
}

export const BetaBernoulli: Story = story(
  "posterior-beta-bernoulli",
  betaValue(1, 1),
  bernoulliValue(),
);

export const BetaBernoulliInformativePrior: Story = story(
  "posterior-beta-bernoulli-informative",
  betaValue(2, 5),
  bernoulliValue(),
  { n_obs: 20, k_hits: 15 },
);

export const NormalNormal: Story = story(
  "posterior-normal-normal",
  normalValue(0, 1),
  normalValue(0, 2),
  { n_obs: 5, k_hits: 0, x_obs: 3 },
);

export const GammaPoisson: Story = story(
  "posterior-gamma-poisson",
  gammaValue(2, 1),
  poissonValue(),
  { n_obs: 4, k_hits: 8 },
);
