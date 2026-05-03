import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import { makeStubProps, StoryFrame } from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/calculus/Function",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const SinX: Story = {
  args: makeStubProps("fn-sinx", "calc.function", { expression: "sin(x)", variable: "x" }),
};

export const Polynomial: Story = {
  args: makeStubProps("fn-poly", "calc.function", { expression: "x**3 - 2*x + 1", variable: "x" }),
};

export const Exponential: Story = {
  args: makeStubProps("fn-exp", "calc.function", { expression: "exp(-x**2/2)", variable: "x" }),
};

export const CustomVariable: Story = {
  args: makeStubProps("fn-t", "calc.function", { expression: "t**2 + cos(t)", variable: "t" }),
};
