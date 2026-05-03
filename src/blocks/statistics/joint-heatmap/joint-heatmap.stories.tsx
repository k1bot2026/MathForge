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
  title: "Blocks/statistics/JointHeatmap",
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

const normalX = distValue(
  {
    parameters: { family: "Normal", mu: 0, sigma: 1 },
    moments: { mean: 0, variance: 1, skewness: 0, excessKurtosis: 0 },
    support: { kind: "continuous", lo: -Infinity, hi: Infinity },
  },
  "Normal",
);

const normalY = distValue(
  {
    parameters: { family: "Normal", mu: 1, sigma: 0.5 },
    moments: { mean: 1, variance: 0.25, skewness: 0, excessKurtosis: 0 },
    support: { kind: "continuous", lo: -Infinity, hi: Infinity },
  },
  "Normal",
);

const betaY = distValue(
  {
    parameters: { family: "Beta", alpha: 2, beta: 5 },
    moments: { mean: 2 / 7, variance: (2 * 5) / (49 * 8) },
    support: { kind: "continuous", lo: 0, hi: 1 },
  },
  "Beta",
);

function storyWithDists(id: string, X: MathValue, Y: MathValue): Story {
  return {
    render: (args) => (
      <>
        <ResultPrimer
          results={[
            { id: "story-upstream-x", result: { kind: "value", value: X } },
            { id: "story-upstream-y", result: { kind: "value", value: Y } },
            { id: (args as { id: string }).id, result: { kind: "value", value: X } },
          ]}
          upstreamEdges={[
            {
              id: "story-edge-x",
              source: "story-upstream-x",
              target: (args as { id: string }).id,
              sourceHandle: "X",
              targetHandle: "X",
            },
            {
              id: "story-edge-y",
              source: "story-upstream-y",
              target: (args as { id: string }).id,
              sourceHandle: "Y",
              targetHandle: "Y",
            },
          ]}
        />
        <BlockNode {...args} />
      </>
    ),
    args: makeStubProps(id, "viz.joint-heatmap"),
  };
}

export const NormalNormal: Story = storyWithDists("joint-heatmap-nn", normalX, normalY);
export const NormalBeta: Story = storyWithDists("joint-heatmap-nb", normalX, betaY);
