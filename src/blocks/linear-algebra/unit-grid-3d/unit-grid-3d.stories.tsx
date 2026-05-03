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
  title: "Blocks/linear-algebra/UnitGrid3d",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

const matrixValue = (rows: number[][]): MathValue => ({
  type: { kind: "Matrix", m: 3, n: 3, field: "real" },
  payload: rows,
  provenance: provenance("la.matrix"),
});

export const Identity: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          {
            id: "story-upstream-matrix-3d",
            result: {
              kind: "value",
              value: matrixValue([
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
              ]),
            },
          },
          {
            id: (args as { id: string }).id,
            result: {
              kind: "value",
              value: matrixValue([
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
              ]),
            },
          },
        ]}
        upstreamEdges={[
          {
            id: "story-edge-3d",
            source: "story-upstream-matrix-3d",
            target: (args as { id: string }).id,
            sourceHandle: "M",
            targetHandle: "M",
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("unit-grid-3d-story-identity", "viz.unit-grid-3d"),
};

export const RotationZ45: Story = {
  render: (args) => {
    const c = Math.SQRT1_2;
    return (
      <>
        <ResultPrimer
          results={[
            {
              id: "story-upstream-matrix-3d-rot",
              result: {
                kind: "value",
                value: matrixValue([
                  [c, -c, 0],
                  [c, c, 0],
                  [0, 0, 1],
                ]),
              },
            },
            {
              id: (args as { id: string }).id,
              result: {
                kind: "value",
                value: matrixValue([
                  [c, -c, 0],
                  [c, c, 0],
                  [0, 0, 1],
                ]),
              },
            },
          ]}
          upstreamEdges={[
            {
              id: "story-edge-3d-rot",
              source: "story-upstream-matrix-3d-rot",
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
  args: makeStubProps("unit-grid-3d-story-rot", "viz.unit-grid-3d"),
};

export const Shear: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          {
            id: "story-upstream-matrix-3d-shear",
            result: {
              kind: "value",
              value: matrixValue([
                [1, 0.5, 0],
                [0, 1, 0],
                [0, 0, 1],
              ]),
            },
          },
          {
            id: (args as { id: string }).id,
            result: {
              kind: "value",
              value: matrixValue([
                [1, 0.5, 0],
                [0, 1, 0],
                [0, 0, 1],
              ]),
            },
          },
        ]}
        upstreamEdges={[
          {
            id: "story-edge-3d-shear",
            source: "story-upstream-matrix-3d-shear",
            target: (args as { id: string }).id,
            sourceHandle: "M",
            targetHandle: "M",
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("unit-grid-3d-story-shear", "viz.unit-grid-3d"),
};

export const Scale: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          {
            id: "story-upstream-matrix-3d-scale",
            result: {
              kind: "value",
              value: matrixValue([
                [2, 0, 0],
                [0, 0.5, 0],
                [0, 0, 1.5],
              ]),
            },
          },
          {
            id: (args as { id: string }).id,
            result: {
              kind: "value",
              value: matrixValue([
                [2, 0, 0],
                [0, 0.5, 0],
                [0, 0, 1.5],
              ]),
            },
          },
        ]}
        upstreamEdges={[
          {
            id: "story-edge-3d-scale",
            source: "story-upstream-matrix-3d-scale",
            target: (args as { id: string }).id,
            sourceHandle: "M",
            targetHandle: "M",
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("unit-grid-3d-story-scale", "viz.unit-grid-3d"),
};
