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
  title: "Blocks/calculus/Limit",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

function functionValue(expression: string, variable = "x"): MathValue {
  const payload: FunctionPayload = { expression, variables: [variable] };
  return {
    type: {
      kind: "Function",
      arity: 1,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    payload: payload as unknown as number,
    provenance: provenance("calc.function"),
  };
}

function story(id: string, fn: MathValue, point: number): Story {
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
    args: makeStubProps(id, "calc.limit", { point }),
  };
}

export const SincAtZero: Story = story("lim-sinc", functionValue("sin(x)/x"), 0);
export const PolynomialAtTwo: Story = story("lim-poly", functionValue("x**2 - 4"), 2);
export const ExpAtZero: Story = story("lim-exp", functionValue("(exp(x) - 1)/x"), 0);
