"use client";

import { useId } from "react";
import type { ParamSpec } from "~/blocks/types";
import { ExpressionEditor } from "./expression-editor";

export type ParamControlProps = {
  name: string;
  spec: ParamSpec;
  value: unknown;
  onChange: (value: unknown) => void;
};

// Params named "expression" get the MathLive editor regardless of kind.
const EXPRESSION_PARAM_NAMES = new Set(["expression"]);

export function ParamControl({ name, spec, value, onChange }: ParamControlProps) {
  const id = useId();
  const label = spec.label ?? name;
  const useExprEditor = EXPRESSION_PARAM_NAMES.has(name) && spec.kind === "string";
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface-2 p-3">
      <ParamLabel id={id} label={label} spec={spec} value={value} />
      {useExprEditor ? (
        <ExpressionEditor
          id={id}
          value={typeof value === "string" ? value : (spec.default as string)}
          onChange={(plain) => onChange(plain)}
        />
      ) : (
        <Control id={id} spec={spec} value={value} onChange={onChange} />
      )}
    </div>
  );
}

function ParamLabel({
  id,
  label,
  spec,
  value,
}: {
  id: string;
  label: string;
  spec: ParamSpec;
  value: unknown;
}) {
  const displayValue = formatValue(spec, value);
  return (
    <div className="flex items-baseline justify-between gap-2">
      <label
        htmlFor={id}
        className="font-mono text-[11px] font-medium uppercase tracking-wider text-fg-muted"
      >
        {label}
      </label>
      {displayValue !== null ? (
        <span className="font-mono text-xs text-fg" data-testid="param-value-display">
          {displayValue}
        </span>
      ) : null}
    </div>
  );
}

function formatValue(spec: ParamSpec, value: unknown): string | null {
  if (spec.kind === "number" || spec.kind === "integer") {
    const n = typeof value === "number" ? value : Number(value ?? spec.default);
    if (!Number.isFinite(n)) return null;
    return Number.isInteger(n) ? String(n) : n.toPrecision(4).replace(/0+$/, "").replace(/\.$/, "");
  }
  if (spec.kind === "boolean") return null;
  if (spec.kind === "select") return null;
  return null;
}

function Control({ id, spec, value, onChange }: { id: string } & Omit<ParamControlProps, "name">) {
  if (spec.kind === "number" || spec.kind === "integer") {
    const numVal = typeof value === "number" ? value : Number(value ?? spec.default);
    const hasRange = spec.min !== undefined && spec.max !== undefined;

    if (hasRange) {
      const min = spec.min ?? 0;
      const max = spec.max ?? 100;
      const step = spec.kind === "integer" ? 1 : "step" in spec ? (spec.step ?? 0.01) : 0.01;
      const pct = ((numVal - min) / (max - min)) * 100;
      return (
        <div className="relative py-1">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-role-control-border"
              style={{ width: `${pct}%` }}
            />
          </div>
          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={Number.isFinite(numVal) ? numVal : spec.default}
            onChange={(e) => {
              const raw =
                spec.kind === "integer"
                  ? Number.parseInt(e.target.value, 10)
                  : Number(e.target.value);
              onChange(Number.isFinite(raw) ? raw : spec.default);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={spec.label ?? id}
          />
          <div
            className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-white bg-role-control-border shadow-block-1"
            style={{ left: `calc(${pct}% - 8px)` }}
          />
        </div>
      );
    }

    return (
      <input
        id={id}
        type="number"
        value={Number.isFinite(numVal) ? numVal : spec.default}
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
        className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 font-mono text-sm text-fg outline-none focus:border-role-control-border focus:ring-1 focus:ring-role-control-border"
      />
    );
  }

  if (spec.kind === "boolean") {
    const checked = typeof value === "boolean" ? value : spec.default;
    return (
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => {
          onChange(!checked);
        }}
        className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-role-control-border ${
          checked ? "border-role-control-border bg-role-control-border" : "border-border bg-surface"
        }`}
      >
        <span
          className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    );
  }

  if (spec.kind === "select") {
    const current = typeof value === "string" ? value : spec.default;
    return (
      <div className="flex flex-wrap gap-1">
        {spec.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              onChange(opt);
            }}
            className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
              opt === current
                ? "bg-role-control-border text-bg"
                : "bg-surface border border-border text-fg-muted hover:bg-surface-2"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
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
      className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 font-mono text-sm text-fg outline-none focus:border-role-control-border focus:ring-1 focus:ring-role-control-border"
    />
  );
}
