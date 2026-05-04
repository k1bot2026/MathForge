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
  title: "Blocks/calculus/VizRiemann",
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

function scalarValue(v: number): MathValue {
  return {
    type: { kind: "Scalar", field: "real", precision: "approximate" },
    payload: v,
    provenance: provenance("core.constant"),
  };
}

function story(id: string, fn: MathValue, a: MathValue, b: MathValue): Story {
  return {
    render: (args) => (
      <>
        <ResultPrimer
          results={[
            { id: "story-fn", result: { kind: "value", value: fn } },
            { id: "story-a", result: { kind: "value", value: a } },
            { id: "story-b", result: { kind: "value", value: b } },
          ]}
          upstreamEdges={[
            {
              id: "edge-fn",
              source: "story-fn",
              target: (args as { id: string }).id,
              sourceHandle: "fn",
              targetHandle: "fn",
            },
            {
              id: "edge-a",
              source: "story-a",
              target: (args as { id: string }).id,
              sourceHandle: "fn",
              targetHandle: "a",
            },
            {
              id: "edge-b",
              source: "story-b",
              target: (args as { id: string }).id,
              sourceHandle: "fn",
              targetHandle: "b",
            },
          ]}
        />
        <BlockNode {...args} />
      </>
    ),
    args: makeStubProps(id, "viz.riemann"),
  };
}

export const SinOnPi: Story = story(
  "riemann-sin",
  functionValue("sin(x)"),
  scalarValue(0),
  scalarValue(Math.PI),
);

export const Quadratic: Story = story(
  "riemann-quad",
  functionValue("x**2"),
  scalarValue(0),
  scalarValue(3),
);

export const GaussianBell: Story = story(
  "riemann-gauss",
  functionValue("exp(-x**2)"),
  scalarValue(-3),
  scalarValue(3),
);
