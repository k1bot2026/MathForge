// Shared template type. Each template is a SerializedGraph payload
// plus a name + one-sentence description so docs/TEMPLATES.md can
// render the catalog without re-reading the source files.

import type { SerializedGraph } from "../graph-codec";

export type Template = {
  /** Stable slug (rotation, shear, eigen-demo). Used in the URL query and the catalog id. */
  id: string;
  label: string;
  description: string;
  graph: SerializedGraph;
};
