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
  title: "Blocks/calculus/Partial",
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

function story(id: string, fn: MathValue, variable: string): Story {
  return {
    render: (args) => (
      <>
        <ResultPrimer
          results={[{ id: "story-fn", result: { kind: "value", value: fn } }]}
          upstreamEdges={[
            {
              id: "edge-fn",
              source: "story-fn",
              target: (args as { id: string }).id,
              sourceHandle: "fn",
              targetHandle: "fn",
            },
          ]}
        />
        <BlockNode {...args} />
      </>
    ),
    args: makeStubProps(id, "calc.partial", { variable }),
  };
}

export const PartialX: Story = story("partial-x", functionValue("x**2 + y**2", ["x", "y"]), "x");
export const PartialY: Story = story("partial-y", functionValue("x**2 + y**2", ["x", "y"]), "y");
export const PartialXYZ: Story = story(
  "partial-xyz",
  functionValue("x*y*z + x**2", ["x", "y", "z"]),
  "x",
);
