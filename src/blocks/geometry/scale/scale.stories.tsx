import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import { makeStubProps, StoryFrame } from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/geometry/Scale",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Double: Story = {
  args: makeStubProps("geom-scale-2", "geom.scale", { factor: 2 }),
};

export const Half: Story = {
  args: makeStubProps("geom-scale-half", "geom.scale", { factor: 0.5 }),
};
