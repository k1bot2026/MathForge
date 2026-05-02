import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import {
  makeStubProps,
  provenance,
  ResultPrimer,
  StoryFrame,
} from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/linear-algebra/Vector2",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          {
            id: (args as { id: string }).id,
            result: {
              kind: "value",
              value: {
                type: { kind: "Vector", n: 2, field: "real" },
                payload: [3, 4],
                provenance: provenance("la.vector2"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("vector2-story", "la.vector2", { x: 3, y: 4 }),
};
