import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import {
  makeStubProps,
  provenance,
  ResultPrimer,
  StoryFrame,
} from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/linear-algebra/Matrix",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Identity2x2: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          {
            id: (args as { id: string }).id,
            result: {
              kind: "value",
              value: {
                type: { kind: "Matrix", m: 2, n: 2, field: "real" },
                payload: [
                  [1, 0],
                  [0, 1],
                ],
                provenance: provenance("la.matrix"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("matrix-story-2x2", "la.matrix", {
    rows: 2,
    cols: 2,
    r0c0: 1,
    r0c1: 0,
    r1c0: 0,
    r1c1: 1,
  }),
};

export const Rect3x2: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          {
            id: (args as { id: string }).id,
            result: {
              kind: "value",
              value: {
                type: { kind: "Matrix", m: 3, n: 2, field: "real" },
                payload: [
                  [1, 2],
                  [3, 4],
                  [5, 6],
                ],
                provenance: provenance("la.matrix"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("matrix-story-3x2", "la.matrix", {
    rows: 3,
    cols: 2,
    r0c0: 1,
    r0c1: 2,
    r1c0: 3,
    r1c1: 4,
    r2c0: 5,
    r2c1: 6,
  }),
};

export const Identity5x5: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          {
            id: (args as { id: string }).id,
            result: {
              kind: "value",
              value: {
                type: { kind: "Matrix", m: 5, n: 5, field: "real" },
                payload: [
                  [1, 0, 0, 0, 0],
                  [0, 1, 0, 0, 0],
                  [0, 0, 1, 0, 0],
                  [0, 0, 0, 1, 0],
                  [0, 0, 0, 0, 1],
                ],
                provenance: provenance("la.matrix"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("matrix-story-5x5", "la.matrix", {
    rows: 5,
    cols: 5,
    r0c0: 1,
    r1c1: 1,
    r2c2: 1,
    r3c3: 1,
    r4c4: 1,
  }),
};
