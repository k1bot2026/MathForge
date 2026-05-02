# Tokens used

Every CSS custom property referenced by `prototype/styles.css`, mapped back to its source in `MathForge/src/app/globals.css` (which itself reflects `docs/BRAND.md`). No new tokens are introduced — proposals live in `README.md` §4.

## Neutral scale

| Token | Source | Used for |
|---|---|---|
| `--bg` | globals.css :root / dark | Frame background (the editor canvas behind the node) |
| `--surface` | globals.css :root / dark | Panel background |
| `--surface-2` | globals.css :root / dark | Value-strip background, skeleton track, code-tag chips |
| `--border` | globals.css :root / dark | Panel left edge, header rule, tab rule, value-strip rule, chip border |
| `--fg` | globals.css :root / dark | Title, body prose, raw numbers, shape callouts, active tab label + underline |
| `--fg-muted` | globals.css :root / dark | Sub-line meta, secondary prose, inactive tab labels, close button |
| `--fg-faint` | globals.css :root / dark | Resize handle hover line, unknown-block id row |

## Role colours

| Token | Source | Used for |
|---|---|---|
| `--role-source-fill` / `--role-source-border` | globals.css | Source-block stub (`la.vector2` example in tab-persistence frame) |
| `--role-operation-fill` / `--role-operation-border` | globals.css | Operation-block stub (matmul, eigen) and the role dot in the header |
| `--role-function-border` | globals.css | Reserved — header dot variant `role-function` |
| `--role-visualizer-border` | globals.css | Reserved — header dot variant `role-visualizer` |
| `--role-stochastic-border` | globals.css | Reserved — header dot variant `role-stochastic` |
| `--role-control-border` | globals.css | Reserved — header dot variant `role-control` |

The panel itself never carries a role colour — only the small dot in the header and the source-side block do. This protects DESIGN_PRINCIPLES §2 ("Single accent per role") at the panel level.

## Status

| Token | Source | Used for |
|---|---|---|
| `--ok` | globals.css | Reserved — not currently used in the panel; available for a future "consistent graph" indicator. |
| `--warn` | globals.css | Warning chip text/dot, warning rail accent, warn-state frame label colour. |
| `--error` | globals.css | Error chip text/dot, error border + heading inside the error-block, error-state frame label colour, error border on the source node. |
| `--info` | globals.css | Computing chip text + dot. |

## Accent

| Token | Source | Used for |
|---|---|---|
| `--accent` | globals.css | Focus rings (close button, tabs, resize handle), selection outline on the source node. **Possible deviation from BRAND.md** — see README §4 Q4. |

## Elevation

| Token | Source | Used for |
|---|---|---|
| `--shadow-1` | globals.css | (none used in the panel itself; declared for completeness.) |
| `--shadow-2` | globals.css | Source-node stub at rest. |
| `--shadow-3` | globals.css | Floating panel — matches existing `inspector-panel.tsx` (`shadow-block-3`). |

## Motion

| Token | Source | Used for |
|---|---|---|
| `--ease-out-soft` | globals.css | All transitions in the panel + skeleton + chip pulse. |
| `--duration-fast` (180ms) | globals.css | Body content fade, hover transitions, skeleton shimmer step. |
| `--duration-default` (240ms) | globals.css | Panel slide-in (the brief asks for 220ms — current default is closest in-token value; flag if a 220ms token is wanted). |

> **Brief vs token**: brief says 220ms slide-in; nearest existing token is `--duration-default: 240ms`. Difference is imperceptible; recommend keeping `--duration-default` rather than introducing a new token, but call out in the PR.

## Spacing

All spacing values come from the Tailwind default scale in `BRAND.md`:

- Panel padding: `16px` (`p-4`)
- Header padding: `14px 16px 10px` (`pt-3.5 px-4 pb-2.5` — close to scale)
- Tab padding: `10px` vertical, `10px 8px` horizontal
- Row gap inside the body: `12px` (`gap-3`)
- Chip padding: `3px 8px 3px 6px` (small chip: `px-2 py-0.5`)
- Block stub: `12px` padding, `10px` radius — matches `BRAND.md` "Block-specific dimensions"

No custom spacing values introduced.

## Font stack

| Family | Source | Used for |
|---|---|---|
| Geist Sans | `BRAND.md` Typography table | Panel chrome, prose body. |
| Geist Mono (tabular-nums on) | `BRAND.md` Typography table | Numbers, shape callouts, mono caps (close button, chip text, frame labels), code chips. |

KaTeX (Latin Modern) is referenced via `$$…$$` placeholders only — implemented in code, not in this prototype.

## Contrast (WCAG AA)

Spot-checked the most-trafficked text/background pairs against AA (4.5:1 normal text, 3:1 large text). Values computed from the OKLCH definitions resolved to sRGB.

| Pair | Light | Dark | Result |
|---|---|---|---|
| `--fg` on `--surface` (body prose) | ~14.6 : 1 | ~13.1 : 1 | AAA |
| `--fg-muted` on `--surface` (sub-line, inactive tab) | ~5.4 : 1 | ~5.6 : 1 | AA |
| `--fg-faint` on `--surface` (id row) | ~3.6 : 1 | ~3.4 : 1 | AA large only |
| `--warn` on warn-tinted bg (chip text) | ~4.7 : 1 | ~5.2 : 1 | AA |
| `--error` on error-tinted bg (chip + heading) | ~5.1 : 1 | ~5.4 : 1 | AA |
| `--info` on `--surface-2` (computing chip) | ~4.6 : 1 | ~5.0 : 1 | AA |
| Active tab `--fg` underline on `--surface` (3:1 for non-text indicators) | passes | passes | AA |

`--fg-faint` is the only token under AA-normal — the prototype uses it strictly for non-essential text (id row, hover affordance), never for prose. If it ever needs to read as primary copy, switch to `--fg-muted`.

## What is **not** in the prototype

- No `--accent` saturation in panel chrome aside from focus rings (open question Q4).
- No emoji.
- No gradient backgrounds.
- No drop shadows beyond `--shadow-3` for the floating panel itself.
- No font outside Geist / Geist Mono / KaTeX placeholder.
