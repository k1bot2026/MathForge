import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import { makeStubProps, StoryFrame } from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/geometry/LineFromEquation",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const HorizontalAxis: Story = {
  args: makeStubProps("geom-line-eq-h", "geom.line-from-equation", { a: "0", b: "1", c: "0" }),
};

export const VerticalAxis: Story = {
  args: makeStubProps("geom-line-eq-v", "geom.line-from-equation", { a: "1", b: "0", c: "0" }),
};

export const Diagonal: Story = {
  args: makeStubProps("geom-line-eq-d", "geom.line-from-equation", { a: "1", b: "-1", c: "0" }),
};
