import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import { makeStubProps, StoryFrame } from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/geometry/Polygon",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Triangle: Story = {
  args: makeStubProps("geom-polygon-tri", "geom.polygon", { vertices: "0,0;1,0;0,1" }),
};

export const Square: Story = {
  args: makeStubProps("geom-polygon-sq", "geom.polygon", { vertices: "0,0;1,0;1,1;0,1" }),
};
