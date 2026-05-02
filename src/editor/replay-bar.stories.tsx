import type { Meta, StoryObj } from "@storybook/nextjs";
import { useEffect } from "react";
import type { ConstructionEvent } from "~/engine/construction-events";
import { useHistoryStore } from "~/store/history-store";
import { ReplayBar } from "./replay-bar";

const demoEvents: ConstructionEvent[] = [
  {
    kind: "node-added",
    node: { id: "matrix-1", type: "block", position: { x: 0, y: 0 }, data: {} },
    at: 0,
  },
  {
    kind: "node-added",
    node: { id: "vector-1", type: "block", position: { x: 0, y: 0 }, data: {} },
    at: 1,
  },
  {
    kind: "node-added",
    node: { id: "matvec-1", type: "block", position: { x: 0, y: 0 }, data: {} },
    at: 2,
  },
  {
    kind: "edge-added",
    edge: { id: "e1", source: "matrix-1", target: "matvec-1" },
    at: 3,
  },
  {
    kind: "edge-added",
    edge: { id: "e2", source: "vector-1", target: "matvec-1" },
    at: 4,
  },
];

function HistoryPrimer({ step }: { step: number }) {
  useEffect(() => {
    useHistoryStore.getState().reset();
    useHistoryStore.getState().setEvents(demoEvents);
    useHistoryStore.getState().setMode("replay");
    useHistoryStore.getState().setCurrentStep(step);
  }, [step]);
  return null;
}

const meta: Meta<typeof ReplayBar> = {
  component: ReplayBar,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story, ctx) => (
      <div className="relative h-32 w-[640px] border border-border bg-bg">
        <HistoryPrimer step={(ctx.args as { step?: number }).step ?? 0} />
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<{ step: number }>;

export const Empty: Story = { args: { step: 0 } };
export const Midway: Story = { args: { step: 3 } };
export const End: Story = { args: { step: 5 } };
