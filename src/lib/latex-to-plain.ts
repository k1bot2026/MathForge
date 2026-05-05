/**
 * Converts a small subset of LaTeX to math.js-compatible plain syntax.
 * Used by both the import dialog and the MathLive expression editor.
 */
export function latexToPlain(latex: string): string {
  return latex
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
    .replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)")
    .replace(/\\sqrt\s+(\S+)/g, "sqrt($1)")
    .replace(/\\sin\b/g, "sin")
    .replace(/\\cos\b/g, "cos")
    .replace(/\\tan\b/g, "tan")
    .replace(/\\ln\b/g, "log")
    .replace(/\\log\b/g, "log10")
    .replace(/\\exp\b/g, "exp")
    .replace(/\\pi\b/g, "pi")
    .replace(/\\infty\b/g, "Infinity")
    .replace(/\\cdot/g, "*")
    .replace(/\\times/g, "*")
    .replace(/\^(\w+)/g, "^($1)")
    .replace(/\s+/g, " ")
    .trim();
}
