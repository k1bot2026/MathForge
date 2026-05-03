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
  title: "Blocks/statistics/PdfCdf",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

function distValue(payload: DistributionPayload, family: string): MathValue {
  return {
    type: { kind: "Distribution", family: family as "Normal" },
    payload: payload as unknown as number,
    provenance: provenance("test"),
  };
}

function storyWithDist(id: string, dist: MathValue): Story {
  return {
    render: (args) => (
      <>
        <ResultPrimer
          results={[
            { id: "story-upstream-dist", result: { kind: "value", value: dist } },
            { id: (args as { id: string }).id, result: { kind: "value", value: dist } },
          ]}
          upstreamEdges={[
            {
              id: "story-edge",
              source: "story-upstream-dist",
              target: (args as { id: string }).id,
              sourceHandle: "X",
              targetHandle: "X",
            },
          ]}
        />
        <BlockNode {...args} />
      </>
    ),
    args: makeStubProps(id, "viz.pdf-cdf"),
  };
}

export const Normal: Story = storyWithDist(
  "pdf-cdf-normal",
  distValue(
    {
      parameters: { family: "Normal", mu: 0, sigma: 1 },
      moments: { mean: 0, variance: 1, skewness: 0, excessKurtosis: 0 },
      support: { kind: "continuous", lo: -Infinity, hi: Infinity },
    },
    "Normal",
  ),
);

export const Poisson: Story = storyWithDist(
  "pdf-cdf-poisson",
  distValue(
    {
      parameters: { family: "Poisson", lambda: 5 },
      moments: { mean: 5, variance: 5, skewness: 1 / Math.sqrt(5), excessKurtosis: 0.2 },
      support: { kind: "discrete", values: [] },
    },
    "Poisson",
  ),
);

export const Beta: Story = storyWithDist(
  "pdf-cdf-beta",
  distValue(
    {
      parameters: { family: "Beta", alpha: 2, beta: 5 },
      moments: { mean: 2 / 7, variance: (2 * 5) / (49 * 8) },
      support: { kind: "continuous", lo: 0, hi: 1 },
    },
    "Beta",
  ),
);

export const Binomial: Story = storyWithDist(
  "pdf-cdf-binomial",
  distValue(
    {
      parameters: { family: "Binomial", n: 20, p: 0.4 },
      moments: { mean: 8, variance: 4.8 },
      support: { kind: "discrete", values: [] },
    },
    "Binomial",
  ),
);

export const Uniform: Story = storyWithDist(
  "pdf-cdf-uniform",
  distValue(
    {
      parameters: { family: "Uniform", a: -2, b: 3 },
      moments: { mean: 0.5, variance: 25 / 12 },
      support: { kind: "continuous", lo: -2, hi: 3 },
    },
    "Uniform",
  ),
);

export const Gamma: Story = storyWithDist(
  "pdf-cdf-gamma",
  distValue(
    {
      parameters: { family: "Gamma", alpha: 3, beta: 1 },
      moments: { mean: 3, variance: 3 },
      support: { kind: "continuous", lo: 0, hi: Infinity },
    },
    "Gamma",
  ),
);
