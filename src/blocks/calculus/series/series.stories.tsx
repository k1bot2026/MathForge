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
  title: "Blocks/calculus/Series",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

function functionValue(expression: string, variable = "n"): MathValue {
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

function story(id: string, fn: MathValue, from: number, to: number): Story {
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
    args: makeStubProps(id, "calc.series", { from, to }),
  };
}

export const NaturalNumbers: Story = story("series-n", functionValue("n"), 1, 10);
export const Squares: Story = story("series-n2", functionValue("n**2"), 1, 5);
export const HarmonicTruncated: Story = story("series-harm", functionValue("1/n"), 1, 20);
