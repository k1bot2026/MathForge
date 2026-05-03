import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import {
  makeStubProps,
  provenance,
  ResultPrimer,
  StoryFrame,
} from "~/editor/nodes/block-node-story-utils";
import type { MathValue } from "~/math/types";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/statistics/Histogram",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

function vecValue(data: number[]): MathValue {
  return {
    type: { kind: "Vector", n: data.length, field: "real" },
    payload: data as unknown as number,
    provenance: provenance("stats.sample"),
  };
}

// Rough Normal(0,1) sample
const normalSamples = vecValue(
  Array.from({ length: 200 }, (_, i) => {
    const u1 = (i + 1) / 201;
    const u2 = (((i * 7) % 200) + 1) / 201;
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }),
);

function storyWithVec(id: string, vec: MathValue): Story {
  return {
    render: (args) => (
      <>
        <ResultPrimer
          results={[
            { id: "story-upstream-vec", result: { kind: "value", value: vec } },
            { id: (args as { id: string }).id, result: { kind: "value", value: vec } },
          ]}
          upstreamEdges={[
            {
              id: "story-edge",
              source: "story-upstream-vec",
              target: (args as { id: string }).id,
              sourceHandle: "samples",
              targetHandle: "samples",
            },
          ]}
        />
        <BlockNode {...args} />
      </>
    ),
    args: makeStubProps(id, "viz.histogram"),
  };
}

export const NormalSamples: Story = storyWithVec("histogram-normal", normalSamples);

export const UniformSamples: Story = storyWithVec(
  "histogram-uniform",
  vecValue(Array.from({ length: 150 }, (_, i) => i / 149)),
);
