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

const uniformPrior = betaValue(1, 1);

function story(id: string, prior: MathValue): Story {
  return {
    render: (args) => (
      <>
        <ResultPrimer
          results={[
            { id: "story-upstream-prior", result: { kind: "value", value: prior } },
            { id: (args as { id: string }).id, result: { kind: "value", value: prior } },
          ]}
          upstreamEdges={[
            {
              id: "story-edge",
              source: "story-upstream-prior",
              target: (args as { id: string }).id,
              sourceHandle: "prior",
              targetHandle: "prior",
            },
          ]}
        />
        <BlockNode {...args} />
      </>
    ),
    args: makeStubProps(id, "viz.posterior-update"),
  };
}

export const UniformPriorTenTrials: Story = story("posterior-update-uniform", uniformPrior);
export const InformativePriorAlpha2Beta5: Story = story(
  "posterior-update-informative",
  betaValue(2, 5),
);
