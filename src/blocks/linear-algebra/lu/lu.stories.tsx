import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import {
  makeStubProps,
  provenance,
  ResultPrimer,
  StoryFrame,
} from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/linear-algebra/Lu",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const TwoByTwo: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          {
            id: (args as { id: string }).id,
            result: {
              kind: "value",
              value: {
                type: {
                  kind: "Tuple",
                  elements: [
                    { kind: "Matrix", m: 2, n: 2, field: "real" },
                    { kind: "Matrix", m: 2, n: 2, field: "real" },
                    { kind: "Matrix", m: 2, n: 2, field: "real" },
                  ],
                },
                // LUP of [[2,1],[4,3]]: P=[[0,1],[1,0]], L=[[1,0],[0.5,1]], U=[[4,3],[0,-0.5]]
                payload: {
                  L: [
                    [1, 0],
                    [0.5, 1],
                  ],
                  U: [
                    [4, 3],
                    [0, -0.5],
                  ],
                  P: [
                    [0, 1],
                    [1, 0],
                  ],
                } as unknown as number[][],
                provenance: provenance("la.lu"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("lu-story-2x2", "la.lu", {}),
};
