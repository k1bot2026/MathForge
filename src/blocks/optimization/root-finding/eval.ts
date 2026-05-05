import { evaluate as mathjsEvaluate } from "mathjs";

export function evalExpr1d(expression: string, variable: string, x: number): number {
  try {
    const result = mathjsEvaluate(expression.replace(/\*\*/g, "^"), { [variable]: x });
    return typeof result === "number" && Number.isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

export function numericalDerivative1d(expression: string, variable: string, x: number): number {
  const h = 1e-7;
  return (
    (evalExpr1d(expression, variable, x + h) - evalExpr1d(expression, variable, x - h)) / (2 * h)
  );
}
