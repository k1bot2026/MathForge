import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import {
  makeStubProps,
  provenance,
  ResultPrimer,
  StoryFrame,
} from "~/editor/nodes/block-node-story-utils";
import type { FunctionPayload, MathValue } from "~/math/types";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/calculus/VizVectorField",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

function functionValue(expression: string, variables: string[]): MathValue {
  const payload: FunctionPayload = { expression, variables };
  return {
    type: {
      kind: "Function",
      arity: variables.length,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    payload: payload as unknown as number,
    provenance: provenance("calc.function"),
  };
}

function story(id: string, fxFn: MathValue, fyFn: MathValue): Story {
  return {
    render: (args) => (
      <>
        <ResultPrimer
          results={[
            { id: "story-fx", result: { kind: "value", value: fxFn } },
            { id: "story-fy", result: { kind: "value", value: fyFn } },
          ]}
          upstreamEdges={[
            {
              id: "edge-fx",
              source: "story-fx",
              target: (args as { id: string }).id,
              sourceHandle: "fn",
              targetHandle: "Fx",
            },
            {
              id: "edge-fy",
              source: "story-fy",
              target: (args as { id: string }).id,
              sourceHandle: "fn",
              targetHandle: "Fy",
            },
          ]}
        />
        <BlockNode {...args} />
      </>
    ),
    args: makeStubProps(id, "viz.vector-field"),
  };
}

// Rotation field: F(x,y) = (-y, x)
export const RotationField: Story = story(
  "vf-rotation",
  functionValue("-y", ["x", "y"]),
  functionValue("x", ["x", "y"]),
);

// Gradient field of x²+y²: F = (2x, 2y)
export const RadialGradient: Story = story(
  "vf-radial",
  functionValue("2*x", ["x", "y"]),
  functionValue("2*y", ["x", "y"]),
);

// Saddle gradient: F = (2x, -2y)
export const SaddleGradient: Story = story(
  "vf-saddle",
  functionValue("2*x", ["x", "y"]),
  functionValue("-2*y", ["x", "y"]),
);
