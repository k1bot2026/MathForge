"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";

export function PlaceholderNode(_: NodeProps) {
  return (
    <div
      data-testid="placeholder-node"
      className="min-w-[180px] rounded-[10px] border border-role-source-border bg-role-source-fill px-3 py-2 text-sm font-medium text-fg shadow-block-1"
    >
      Hello block
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
