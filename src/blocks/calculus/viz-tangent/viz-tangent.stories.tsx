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
  title: "Blocks/calculus/VizTangent",
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

export const SinX: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[{ id: "story-fn", result: { kind: "value", value: functionValue("sin(x)") } }]}
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
  args: makeStubProps("viz-tangent-sin", "viz.tangent"),
};

export const SinXWithDerivative: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          { id: "story-fn", result: { kind: "value", value: functionValue("sin(x)") } },
          { id: "story-deriv", result: { kind: "value", value: functionValue("cos(x)") } },
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
            id: "edge-deriv",
            source: "story-deriv",
            target: (args as { id: string }).id,
            sourceHandle: "fn",
            targetHandle: "derivative",
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("viz-tangent-sin-deriv", "viz.tangent"),
};
