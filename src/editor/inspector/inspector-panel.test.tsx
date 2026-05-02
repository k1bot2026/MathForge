import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { useGraphStore } from "~/store/graph-store";
import { InspectorPanel } from "./inspector-panel";

const initialState = useGraphStore.getState();

beforeEach(() => {
  useGraphStore.setState(initialState, true);
});

afterEach(() => {
  useGraphStore.setState(initialState, true);
});

describe("InspectorPanel", () => {
  test("renders nothing when no node is selected", () => {
    useGraphStore.getState().setSelectedNodeId(null);
    const { container } = render(<InspectorPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  test("renders the block label and parameter form when a node is selected", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    render(<InspectorPanel />);
    expect(screen.getByTestId("inspector-panel")).toBeInTheDocument();
    expect(screen.getByText("Constant")).toBeInTheDocument();
    expect(screen.getByTestId("inspector-params")).toBeInTheDocument();
  });

  test("editing a number param flows through updateNodeParams", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    render(<InspectorPanel />);
    const input = screen.getByLabelText("Value") as HTMLInputElement;
    expect(input.value).toBe("42");
    fireEvent.change(input, { target: { value: "7" } });
    const constantNode = useGraphStore.getState().nodes.find((n) => n.id === "constant-1");
    const params = (constantNode?.data as { params?: Record<string, unknown> } | undefined)?.params;
    expect(params?.value).toBe(7);
  });

  test("close button clears selectedNodeId and unmounts the panel", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    render(<InspectorPanel />);
    fireEvent.click(screen.getByTestId("inspector-close"));
    expect(useGraphStore.getState().selectedNodeId).toBeNull();
  });

  test("renders the four-tab explanation block; what / why are always available", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    render(<InspectorPanel />);
    expect(screen.getByTestId("explanation-tab-what")).toBeInTheDocument();
    expect(screen.getByTestId("explanation-tab-why")).toBeInTheDocument();
    // Default tab is "what".
    expect(screen.getByTestId("explanation-text-what")).toHaveTextContent(/fixed real value/i);
  });

  test("effect / impact tabs only appear once a result is in the store", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    const { rerender } = render(<InspectorPanel />);
    expect(screen.queryByTestId("explanation-tab-effect")).toBeNull();

    useGraphStore.getState().setResults(
      new Map([
        [
          "constant-1",
          {
            kind: "value" as const,
            value: {
              type: {
                kind: "Scalar" as const,
                field: "real" as const,
                precision: "exact" as const,
              },
              payload: 42,
              provenance: {
                blockId: "core.constant",
                inputs: [],
                computedAt: 0,
                engine: "native" as const,
              },
            },
          },
        ],
      ]),
    );

    rerender(<InspectorPanel />);
    expect(screen.getByTestId("explanation-tab-effect")).toBeInTheDocument();
    expect(screen.getByTestId("explanation-tab-impact")).toBeInTheDocument();
  });

  test("renders 'Block not registered' fallback for an unknown blockId", () => {
    useGraphStore.getState().addNode({
      id: "ghost",
      type: "block",
      position: { x: 0, y: 0 },
      data: { blockId: "not.a.block", params: {} },
    });
    useGraphStore.getState().setSelectedNodeId("ghost");
    render(<InspectorPanel />);
    expect(screen.getByText(/Block not registered/)).toBeInTheDocument();
  });
});
