import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import {
  makeStubProps,
  provenance,
  ResultPrimer,
  StoryFrame,
} from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/linear-algebra/Add",
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
                payload: [
                  [6, 8],
                  [10, 12],
                ],
                provenance: provenance("la.add"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("add-story-2x2", "la.add", {}),
};
