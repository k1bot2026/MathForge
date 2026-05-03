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
  title: "Blocks/statistics/Mgf",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

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

function poissonValue(lambda: number): MathValue {
  const payload: DistributionPayload = {
    parameters: { family: "Poisson", lambda },
    moments: { mean: lambda, variance: lambda },
    support: {
      kind: "discrete",
      values: Array.from({ length: 11 }, (_, i) => i),
    },
  };
  return {
    type: { kind: "Distribution", family: "Poisson" },
    payload: payload as unknown as number,
    provenance: provenance("stats.poisson"),
  };
}

function story(id: string, dist: MathValue): Story {
  return {
    render: (args) => (
      <>
        <ResultPrimer
          results={[{ id: "story-dist", result: { kind: "value", value: dist } }]}
          upstreamEdges={[
            {
              id: "edge-dist",
              source: "story-dist",
              target: (args as { id: string }).id,
              sourceHandle: "distribution",
              targetHandle: "distribution",
            },
          ]}
        />
        <BlockNode {...args} />
      </>
    ),
    args: makeStubProps(id, "stats.mgf"),
  };
}

export const NormalStandard: Story = story("mgf-normal-standard", normalValue(0, 1));
export const NormalShifted: Story = story("mgf-normal-shifted", normalValue(2, 3));
export const Poisson: Story = story("mgf-poisson", poissonValue(3));
