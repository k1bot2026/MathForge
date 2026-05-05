import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import { makeStubProps, StoryFrame } from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/geometry/Point",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Origin: Story = {
  args: makeStubProps("geom-point-origin", "geom.point", { coords: "0, 0" }),
};

export const Point2D: Story = {
  args: makeStubProps("geom-point-2d", "geom.point", { coords: "3, 4" }),
};

export const Point3D: Story = {
  args: makeStubProps("geom-point-3d", "geom.point", { coords: "1, 2, 3" }),
};
