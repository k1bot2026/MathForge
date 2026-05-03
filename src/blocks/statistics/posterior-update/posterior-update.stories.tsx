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
  title: "Blocks/statistics/PosteriorUpdate",
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

function story(id: string, prior: MathValue, posterior: MathValue): Story {
  return {
    render: (args) => (
      <>
        <ResultPrimer
          results={[
            { id: "story-prior", result: { kind: "value", value: prior } },
            { id: "story-posterior", result: { kind: "value", value: posterior } },
            { id: (args as { id: string }).id, result: { kind: "value", value: posterior } },
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
              id: "edge-posterior",
              source: "story-posterior",
              target: (args as { id: string }).id,
              sourceHandle: "posterior",
              targetHandle: "posterior",
            },
          ]}
        />
        <BlockNode {...args} />
      </>
    ),
    args: makeStubProps(id, "viz.posterior-update"),
  };
}

// Uniform prior Beta(1,1) + 7/10 → Beta(8,4)
export const UniformPriorTenTrials: Story = story(
  "posterior-update-uniform",
  betaValue(1, 1),
  betaValue(8, 4),
);

// Informative prior Beta(2,5) + 15/20 → Beta(17,10)
export const InformativePriorAlpha2Beta5: Story = story(
  "posterior-update-informative",
  betaValue(2, 5),
  betaValue(17, 10),
);

// Strong prior Beta(10,10) + 3/5 → Beta(13,12) — posterior barely moves
export const StrongPrior: Story = story(
  "posterior-update-strong-prior",
  betaValue(10, 10),
  betaValue(13, 12),
);
