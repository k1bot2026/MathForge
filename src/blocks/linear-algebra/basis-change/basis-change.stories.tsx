import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import {
  makeStubProps,
  provenance,
  ResultPrimer,
  StoryFrame,
} from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/linear-algebra/BasisChange",
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
                type: { kind: "Matrix", m: 2, n: 2, field: "real" },
                // T = [[2,1],[0,3]], P = [[1,1],[0,1]] → T′ = P⁻¹·T·P
                // P⁻¹ = [[1,-1],[0,1]], T′ = [[2,0],[0,3]]
                payload: [
                  [2, 0],
                  [0, 3],
                ] as unknown as number[][],
                provenance: provenance("la.basis-change"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("basis-change-story-2x2", "la.basis-change", {}),
};
