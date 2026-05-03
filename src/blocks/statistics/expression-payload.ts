// ExpressionPayload — used by stats.mgf and future symbolic blocks.
//
// The `latex` field is optional: filled in when the calling block has
// also asked SymPy for a LaTeX rendering. Blocks that only need the
// raw SymPy-string for further computation can omit it.

export type ExpressionPayload = {
  /** SymPy str() representation, e.g. "exp(mu*t + sigma**2*t**2/2)" */
  sympyStr: string;
  /** Free variable names present in the expression, e.g. ["t"] */
  freeVars: ReadonlyArray<string>;
  /** LaTeX rendering if available */
  latex?: string | undefined;
};
