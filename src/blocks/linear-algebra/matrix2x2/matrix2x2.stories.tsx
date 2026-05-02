import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import {
  makeStubProps,
  provenance,
  ResultPrimer,
  StoryFrame,
} from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/linear-algebra/Matrix2x2",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Identity: Story = {
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
                provenance: provenance("la.matrix2x2"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("matrix-story", "la.matrix2x2", { a: 1, b: 0, c: 0, d: 1 }),
};

export const Shear: Story = {
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
                  [1, 1.5],
                  [0, 1],
                ],
                provenance: provenance("la.matrix2x2"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("matrix-story-shear", "la.matrix2x2", { a: 1, b: 1.5, c: 0, d: 1 }),
};
