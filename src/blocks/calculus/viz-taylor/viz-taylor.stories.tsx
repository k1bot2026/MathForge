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
  title: "Blocks/calculus/VizTaylor",
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

export const FunctionOnly: Story = {
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
  args: makeStubProps("viz-taylor-fn-only", "viz.taylor"),
};

export const WithTaylorOrder3: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          { id: "story-fn", result: { kind: "value", value: functionValue("sin(x)") } },
          {
            id: "story-t3",
            result: { kind: "value", value: functionValue("x - x**3/6") },
          },
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
            id: "edge-t3",
            source: "story-t3",
            target: (args as { id: string }).id,
            sourceHandle: "fn",
            targetHandle: "taylor",
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("viz-taylor-order3", "viz.taylor"),
};

export const WithTaylorOrder7: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          { id: "story-fn", result: { kind: "value", value: functionValue("sin(x)") } },
          {
            id: "story-t7",
            result: {
              kind: "value",
              value: functionValue("x - x**3/6 + x**5/120 - x**7/5040"),
            },
          },
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
            id: "edge-t7",
            source: "story-t7",
            target: (args as { id: string }).id,
            sourceHandle: "fn",
            targetHandle: "taylor",
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("viz-taylor-order7", "viz.taylor"),
};
