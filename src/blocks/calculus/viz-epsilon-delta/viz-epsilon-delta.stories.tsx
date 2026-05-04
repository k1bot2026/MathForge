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
  title: "Blocks/calculus/VizEpsilonDelta",
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

function story(id: string, fn: MathValue, c: MathValue, L: MathValue): Story {
  return {
    render: (args) => (
      <>
        <ResultPrimer
          results={[
            { id: "story-fn", result: { kind: "value", value: fn } },
            { id: "story-c", result: { kind: "value", value: c } },
            { id: "story-L", result: { kind: "value", value: L } },
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
              id: "edge-c",
              source: "story-c",
              target: (args as { id: string }).id,
              sourceHandle: "fn",
              targetHandle: "c",
            },
            {
              id: "edge-L",
              source: "story-L",
              target: (args as { id: string }).id,
              sourceHandle: "fn",
              targetHandle: "L",
            },
          ]}
        />
        <BlockNode {...args} />
      </>
    ),
    args: makeStubProps(id, "viz.epsilon-delta"),
  };
}

export const LinearAtZero: Story = story(
  "epsdelta-linear",
  functionValue("2*x + 1"),
  scalarValue(0),
  scalarValue(1),
);

export const QuadraticAtOne: Story = story(
  "epsdelta-quad",
  functionValue("x**2"),
  scalarValue(1),
  scalarValue(1),
);

export const SinAtPiOver2: Story = story(
  "epsdelta-sin",
  functionValue("sin(x)"),
  scalarValue(Math.PI / 2),
  scalarValue(1),
);
