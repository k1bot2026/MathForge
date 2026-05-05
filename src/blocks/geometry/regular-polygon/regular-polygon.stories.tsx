import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import { makeStubProps, StoryFrame } from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/geometry/RegularPolygon",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Hexagon: Story = {
  args: makeStubProps("geom-hexagon", "geom.regular-polygon", { n: "6", radius: "1" }),
};

export const Triangle: Story = {
  args: makeStubProps("geom-triangle", "geom.regular-polygon", { n: "3", radius: "1" }),
};

export const Pentagon: Story = {
  args: makeStubProps("geom-pentagon", "geom.regular-polygon", { n: "5", radius: "2" }),
};
