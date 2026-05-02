"use client";

// Renders one parameter editor per ParamSpec kind. The Phase-1 surface
// covers number / integer / boolean / select / string — the same five
// kinds the BlockDefinition layer accepts. Sliders for scalar-input's
// min/max-bounded number land alongside that block's UI polish in a
// later session; for now bounded numbers fall back to the standard
// number input with min/max attributes.

import { useId } from "react";
import type { ParamSpec } from "~/blocks/types";

export type ParamControlProps = {
  name: string;
  spec: ParamSpec;
  value: unknown;
  onChange: (value: unknown) => void;
};

export function ParamControl({ name, spec, value, onChange }: ParamControlProps) {
  const id = useId();
  const label = spec.label ?? name;
  return (
    <label htmlFor={id} className="flex flex-col gap-1 py-1.5">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      <Control id={id} spec={spec} value={value} onChange={onChange} />
    </label>
  );
}

function Control({ id, spec, value, onChange }: { id: string } & Omit<ParamControlProps, "name">) {
  const baseInputClass =
    "rounded-md border border-border bg-bg px-2 py-1 text-sm text-fg outline-none focus:border-accent focus:ring-1 focus:ring-accent";

  if (spec.kind === "number" || spec.kind === "integer") {
    const numericValue = typeof value === "number" ? value : Number(value ?? spec.default);
    return (
      <input
        id={id}
        type="number"
        value={Number.isFinite(numericValue) ? numericValue : spec.default}
        step={spec.kind === "integer" ? 1 : "step" in spec ? (spec.step ?? "any") : "any"}
        {...(spec.min !== undefined ? { min: spec.min } : {})}
        {...(spec.max !== undefined ? { max: spec.max } : {})}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(spec.default);
            return;
          }
          const next = spec.kind === "integer" ? Number.parseInt(raw, 10) : Number(raw);
          onChange(Number.isFinite(next) ? next : spec.default);
        }}
        className={baseInputClass}
      />
    );
  }
  if (spec.kind === "boolean") {
    const checked = typeof value === "boolean" ? value : spec.default;
    return (
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
        className="h-4 w-4 rounded border border-border accent-accent"
      />
    );
  }
  if (spec.kind === "select") {
    const current = typeof value === "string" ? value : spec.default;
    return (
      <select
        id={id}
        value={current}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className={baseInputClass}
      >
        {spec.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }
  // string
  const stringValue = typeof value === "string" ? value : spec.default;
  return (
    <input
      id={id}
      type="text"
      value={stringValue}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      className={baseInputClass}
    />
  );
}
