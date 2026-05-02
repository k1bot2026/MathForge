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
  title: "Blocks/linear-algebra/UnitGrid",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

const matrixValue = (rows: number[][]): MathValue => ({
  type: { kind: "Matrix", m: 2, n: 2, field: "real" },
  payload: rows,
  provenance: provenance("la.matrix2x2"),
});

// The visualizer reads `inputs.M` from the store via useNodeInputs(),
// which walks edges from the block. The fake upstream node + edge let
// the story render the SVG without spinning up the evaluator.

export const Identity: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          {
            id: "story-upstream-matrix",
            result: {
              kind: "value",
              value: matrixValue([
                [1, 0],
                [0, 1],
              ]),
            },
          },
          {
            id: (args as { id: string }).id,
            result: {
              kind: "value",
              value: matrixValue([
                [1, 0],
                [0, 1],
              ]),
            },
          },
        ]}
        upstreamEdges={[
          {
            id: "story-edge",
            source: "story-upstream-matrix",
            target: (args as { id: string }).id,
            sourceHandle: "M",
            targetHandle: "M",
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("unit-grid-story", "viz.unit-grid"),
};

export const Rotation45: Story = {
  render: (args) => {
    const c = Math.SQRT1_2;
    return (
      <>
        <ResultPrimer
          results={[
            {
              id: "story-upstream-matrix",
              result: {
                kind: "value",
                value: matrixValue([
                  [c, -c],
                  [c, c],
                ]),
              },
            },
            {
              id: (args as { id: string }).id,
              result: {
                kind: "value",
                value: matrixValue([
                  [c, -c],
                  [c, c],
                ]),
              },
            },
          ]}
          upstreamEdges={[
            {
              id: "story-edge",
              source: "story-upstream-matrix",
              target: (args as { id: string }).id,
              sourceHandle: "M",
              targetHandle: "M",
            },
          ]}
        />
        <BlockNode {...args} />
      </>
    );
  },
  args: makeStubProps("unit-grid-story-rot", "viz.unit-grid"),
};

export const Shear: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          {
            id: "story-upstream-matrix",
            result: {
              kind: "value",
              value: matrixValue([
                [1, 1.5],
                [0, 1],
              ]),
            },
          },
          {
            id: (args as { id: string }).id,
            result: {
              kind: "value",
              value: matrixValue([
                [1, 1.5],
                [0, 1],
              ]),
            },
          },
        ]}
        upstreamEdges={[
          {
            id: "story-edge",
            source: "story-upstream-matrix",
            target: (args as { id: string }).id,
            sourceHandle: "M",
            targetHandle: "M",
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("unit-grid-story-shear", "viz.unit-grid"),
};
