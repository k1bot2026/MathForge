import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import { makeStubProps, StoryFrame } from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/calculus/OdeSolve",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

// Standalone stories — no upstream input, driven entirely by params.
// The block will call dsolve() with the ode param on render.

export const ExponentialGrowth: Story = {
  args: {
    ...makeStubProps("ode-exp", "calc.ode-solve"),
    data: {
      blockId: "calc.ode-solve",
      params: { ode: "y' - y", depVar: "y", indepVar: "x", x0: 0, y0: 1 },
    },
  },
};

export const SecondOrderHarmonic: Story = {
  args: {
    ...makeStubProps("ode-harmonic", "calc.ode-solve"),
    data: {
      blockId: "calc.ode-solve",
      params: { ode: "y'' + y", depVar: "y", indepVar: "x" },
    },
  },
};

export const SeparableOde: Story = {
  args: {
    ...makeStubProps("ode-sep", "calc.ode-solve"),
    data: {
      blockId: "calc.ode-solve",
      params: { ode: "y' - x*y", depVar: "y", indepVar: "x" },
    },
  },
};
