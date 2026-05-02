import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import {
  makeStubProps,
  provenance,
  ResultPrimer,
  StoryFrame,
} from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/common/Constant",
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
                type: { kind: "Scalar", field: "real", precision: "exact" },
                payload: 42,
                provenance: provenance("core.constant"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("constant-story", "core.constant", { value: 42 }),
};

export const Computing: Story = {
  render: (args) => (
    <>
      <ResultPrimer results={[{ id: (args as { id: string }).id, result: undefined }]} />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("constant-story-computing", "core.constant", { value: 0 }),
};
