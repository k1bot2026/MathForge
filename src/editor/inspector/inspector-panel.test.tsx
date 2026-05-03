import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { useGraphStore } from "~/store/graph-store";
import { useUiStore } from "~/store/ui-store";
import { InspectorPanel } from "./inspector-panel";

const initialGraph = useGraphStore.getState();

beforeEach(() => {
  useGraphStore.setState(initialGraph, true);
  useUiStore.getState().reset();
});

afterEach(() => {
  useGraphStore.setState(initialGraph, true);
  useUiStore.getState().reset();
});

const valueResult = (nodeId: string, payload: number) =>
  new Map([
    [
      nodeId,
      {
        kind: "value" as const,
        value: {
          type: { kind: "Scalar" as const, field: "real" as const, precision: "exact" as const },
          payload,
          provenance: {
            blockId: "core.constant",
            inputs: [],
            computedAt: 0,
            engine: "native" as const,
          },
        },
      },
    ],
  ]);

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
    expect(screen.getByTestId("explanation-text-what")).toHaveTextContent(/fixed real value/i);
  });

  test("effect / impact tabs only appear once a result is in the store", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    const { rerender } = render(<InspectorPanel />);
    expect(screen.queryByTestId("explanation-tab-effect")).toBeNull();

    useGraphStore.getState().setResults(valueResult("constant-1", 42));
    rerender(<InspectorPanel />);
    expect(screen.getByTestId("explanation-tab-effect")).toBeInTheDocument();
    expect(screen.getByTestId("explanation-tab-impact")).toBeInTheDocument();
  });

  test("renders the unregistered fallback for an unknown blockId", () => {
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

  // ── New: state chip wired in the header ─────────────────────────────────

  test("shows state-chip-computing when no result is in the store", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    render(<InspectorPanel />);
    expect(screen.getByTestId("state-chip-computing")).toBeInTheDocument();
  });

  test("shows state-chip-value once the node has a value result", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    useGraphStore.getState().setResults(valueResult("constant-1", 42));
    render(<InspectorPanel />);
    expect(screen.getByTestId("state-chip-value")).toBeInTheDocument();
  });

  test("shows state-chip-error when the result is an EvaluationError", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    useGraphStore
      .getState()
      .setResults(
        new Map([
          [
            "constant-1",
            { kind: "error" as const, error: { nodeId: "constant-1", message: "boom" } },
          ],
        ]),
      );
    render(<InspectorPanel />);
    expect(screen.getByTestId("state-chip-error")).toBeInTheDocument();
  });

  test("shows state-chip-unknown when block def is missing", () => {
    useGraphStore.getState().addNode({
      id: "ghost",
      type: "block",
      position: { x: 0, y: 0 },
      data: { blockId: "not.a.block", params: {} },
    });
    useGraphStore.getState().setSelectedNodeId("ghost");
    render(<InspectorPanel />);
    expect(screen.getByTestId("state-chip-unknown")).toBeInTheDocument();
  });

  // ── New: workspace-scoped tab persistence ───────────────────────────────

  test("active tab persists across selection changes", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    useGraphStore.getState().setResults(valueResult("constant-1", 42));
    const { rerender } = render(<InspectorPanel />);
    fireEvent.click(screen.getByTestId("explanation-tab-effect"));
    expect(useUiStore.getState().activeExplanationTab).toBe("effect");

    useGraphStore.getState().setSelectedNodeId("matrix-1");
    rerender(<InspectorPanel />);
    expect(useUiStore.getState().activeExplanationTab).toBe("effect");
  });

  // ── New: resize handle ─────────────────────────────────────────────────

  test("resize handle exposes the separator ARIA contract", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    render(<InspectorPanel />);
    const handle = screen.getByTestId("inspector-resize");
    expect(handle).toHaveAttribute("role", "separator");
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAttribute("aria-valuemin", "320");
    expect(handle).toHaveAttribute("aria-valuemax", "520");
    expect(handle).toHaveAttribute("aria-valuenow", "380");
  });

  test("ArrowRight on the resize handle nudges width up by 16px", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    render(<InspectorPanel />);
    fireEvent.keyDown(screen.getByTestId("inspector-resize"), { key: "ArrowRight" });
    expect(useUiStore.getState().inspectorWidth).toBe(396);
  });

  // ── New: value strip ───────────────────────────────────────────────────

  test("value strip is hidden in non-value states", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    render(<InspectorPanel />);
    expect(screen.queryByTestId("inspector-value-strip")).toBeNull();
  });

  test("value strip renders the current output when a value is available", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    useGraphStore.getState().setResults(valueResult("constant-1", 42));
    render(<InspectorPanel />);
    expect(screen.getByTestId("inspector-value-strip")).toBeInTheDocument();
  });

  // ── New: previewRenderer ──────────────────────────────────────────────────

  test("inspector-preview section renders for la.eigen with a 2×2 value result", () => {
    useGraphStore.getState().addNode({
      id: "eigen-test",
      type: "block",
      position: { x: 0, y: 0 },
      data: { blockId: "la.eigen", params: {} },
    });
    useGraphStore.getState().setSelectedNodeId("eigen-test");
    useGraphStore.getState().setResults(
      new Map([
        [
          "eigen-test",
          {
            kind: "value" as const,
            value: {
              type: {
                kind: "Tuple" as const,
                elements: [
                  { kind: "Vector" as const, n: 2, field: "real" as const },
                  { kind: "Matrix" as const, m: 2, n: 2, field: "real" as const },
                ],
              },
              payload: {
                eigenvalues: [1, -1],
                eigenvectors: [
                  [1, 0],
                  [0, 1],
                ],
              } as unknown as number[][],
              provenance: {
                blockId: "la.eigen",
                inputs: [],
                computedAt: 0,
                engine: "mathjs" as const,
              },
            },
          },
        ],
      ]),
    );
    render(<InspectorPanel />);
    expect(screen.getByTestId("inspector-preview")).toBeInTheDocument();
    expect(screen.getByTestId("eigen-preview-2d")).toBeInTheDocument();
  });

  test("inspector-preview is absent for blocks without previewRenderer", () => {
    useGraphStore.getState().setSelectedNodeId("constant-1");
    useGraphStore.getState().setResults(valueResult("constant-1", 42));
    render(<InspectorPanel />);
    expect(screen.queryByTestId("inspector-preview")).toBeNull();
  });
});
