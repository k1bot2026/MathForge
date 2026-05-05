import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import { makeStubProps, StoryFrame } from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/geometry/Rotate",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const QuarterTurn: Story = {
  args: makeStubProps("geom-rotate-90", "geom.rotate", { angle: Math.PI / 2 }),
};

export const HalfTurn: Story = {
  args: makeStubProps("geom-rotate-180", "geom.rotate", { angle: Math.PI }),
};
