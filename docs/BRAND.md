# Brand & Design Tokens

The visual identity of MathForge. This file is the reference for both Claude Code (when implementing UI) and Claude Design (when generating mockups). When something changes here, both sides update.

## Working name

**MathForge.** Placeholder; rename anytime by find-replace in `package.json`, `app/layout.tsx`, and this file.

## Wordmark

Geist Sans, 600 weight, tracking -0.02em. Lowercase except the F: `mathForge`. No gradient, no icon to its left in default presentation; an optional mark (a small braid/lattice glyph) may appear in the favicon and in OG images.

## Typography

| Role | Family | Notes |
|---|---|---|
| UI / body | **Geist Sans** | Variable weight 400/500/600 |
| Math display | **KaTeX defaults (Latin Modern)** | Don't override |
| Code, raw values | **Geist Mono** | tabular numerals on |
| Block labels | Geist Sans 500 | 13px |
| Block symbols (e.g. "A·B") | Geist Mono 500 | 16px |

Type scale (`rem`):

```
xs   0.75   /  caption, status bars
sm   0.875  /  default body
md   1.0    /  prose
lg   1.125  /  panel headers
xl   1.25   /  page headers
2xl  1.5    /  hero
3xl  1.875  /  marketing only
```

Line height: 1.5 for prose, 1.3 for UI dense areas.

## Colour system

Use OKLCH. All tokens defined as CSS variables in `src/styles/tokens.css`, exposed to Tailwind v4 via the `@theme` block.

### Neutral scale (light / dark)

| Token | Light (OKLCH) | Dark (OKLCH) | Use |
|---|---|---|---|
| `--bg` | `oklch(99% 0.005 240)` | `oklch(13% 0.012 240)` | canvas, page |
| `--surface` | `oklch(98% 0.005 240)` | `oklch(17% 0.012 240)` | panels, blocks |
| `--surface-2` | `oklch(96% 0.006 240)` | `oklch(20% 0.013 240)` | hover, raised |
| `--border` | `oklch(92% 0.008 240)` | `oklch(28% 0.015 240)` | hairlines |
| `--fg` | `oklch(20% 0.015 240)` | `oklch(95% 0.01 240)` | primary text |
| `--fg-muted` | `oklch(45% 0.012 240)` | `oklch(70% 0.012 240)` | secondary text |
| `--fg-faint` | `oklch(60% 0.01 240)` | `oklch(55% 0.01 240)` | hints, placeholders |

### Semantic role colours (block categories)

Each role has a base hue. Within a role, vary chroma/lightness for sub-types.

| Role | Hue (OKLCH C/H) | Light fill | Dark fill | Border (light/dark) |
|---|---|---|---|---|
| Source (data) | sky / `0.10 / 235` | `oklch(95% 0.05 235)` | `oklch(30% 0.06 235)` | `oklch(75% 0.10 235)` / `oklch(60% 0.10 235)` |
| Operation | violet / `0.12 / 285` | `oklch(95% 0.05 285)` | `oklch(30% 0.07 285)` | `oklch(70% 0.12 285)` / `oklch(60% 0.12 285)` |
| Function | amber / `0.13 / 80` | `oklch(95% 0.06 80)` | `oklch(30% 0.07 80)` | `oklch(78% 0.14 80)` / `oklch(70% 0.14 80)` |
| Visualizer / sink | emerald / `0.13 / 155` | `oklch(95% 0.05 155)` | `oklch(30% 0.07 155)` | `oklch(72% 0.14 155)` / `oklch(60% 0.14 155)` |
| Stochastic source | rose / `0.12 / 15` | `oklch(95% 0.05 15)` | `oklch(30% 0.07 15)` | `oklch(72% 0.13 15)` / `oklch(62% 0.13 15)` |
| Control | slate (neutral chroma) | `oklch(95% 0.01 240)` | `oklch(30% 0.015 240)` | `oklch(75% 0.02 240)` / `oklch(60% 0.02 240)` |

### Block-body palette (canvas)

Parallel to the role colours above. The `--role-{role}-fill` tokens are tuned
for *tinted-card surfaces* in the inspector — high lightness, very low chroma,
no contrast guarantee against block bodies. Canvas blocks live as the
foreground and need a separate, slightly punchier-but-still-dusty register:
solid fills (no border) with auto-contrast text. Two ramps so canvas and
inspector evolve independently.

| Token | Light fill | Dark fill | Light fg | Dark fg |
|---|---|---|---|---|
| `--block-source-{fill,fg}` | `oklch(80% 0.030 235)` | `oklch(38% 0.040 235)` | `oklch(28% 0.04 235)` | `oklch(92% 0.02 235)` |
| `--block-operation-{fill,fg}` | `oklch(78% 0.035 285)` | `oklch(36% 0.045 285)` | `oklch(28% 0.05 285)` | `oklch(92% 0.03 285)` |
| `--block-function-{fill,fg}` | `oklch(82% 0.040 80)` | `oklch(40% 0.055 80)` | `oklch(30% 0.06 80)` | `oklch(94% 0.04 80)` |
| `--block-visualizer-{fill,fg}` | `oklch(80% 0.035 155)` | `oklch(38% 0.050 155)` | `oklch(28% 0.05 155)` | `oklch(92% 0.03 155)` |
| `--block-stochastic-{fill,fg}` | `oklch(80% 0.035 15)` | `oklch(38% 0.050 15)` | `oklch(28% 0.05 15)` | `oklch(92% 0.03 15)` |
| `--block-control-{fill,fg}` | `oklch(82% 0.012 240)` | `oklch(34% 0.012 240)` | `oklch(30% 0.015 240)` | `oklch(92% 0.01 240)` |

Contrast (light): all pairs ≥ 6.6:1, well above AA at 13–14px body weight.
Dark mirrors the relationship at ~54 ΔL.

### Status colours

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ok` | `oklch(60% 0.14 150)` | `oklch(70% 0.14 150)` | success, valid connection |
| `--warn` | `oklch(70% 0.16 70)` | `oklch(78% 0.16 70)` | precision warning, beta |
| `--error` | `oklch(58% 0.20 25)` | `oklch(70% 0.18 25)` | type mismatch, eval error |
| `--info` | `oklch(60% 0.13 240)` | `oklch(72% 0.13 240)` | hints |

### Status soft-tints

Background and border tints used for status chips and surfaces (e.g. the
explanation-panel state chip, the canvas type-mismatch tooltip). Static OKLCH
per theme rather than runtime `color-mix` — Safari has lingering quirks with
`color-mix(in oklch, …)`, and these values land on the AA side of contrast
when paired with the matching status token as text.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--warn-soft` | `oklch(96% 0.025 70)` | `oklch(28% 0.040 70)` | warn chip / surface bg |
| `--warn-border-soft` | `oklch(82% 0.080 70)` | `oklch(50% 0.090 70)` | warn chip / surface border |
| `--error-soft` | `oklch(95% 0.040 25)` | `oklch(28% 0.050 25)` | error chip / surface bg |
| `--error-border-soft` | `oklch(78% 0.110 25)` | `oklch(50% 0.110 25)` | error chip / surface border |
| `--info-soft` | `oklch(96% 0.025 240)` | `oklch(28% 0.040 240)` | info / computing chip bg |
| `--info-border-soft` | `oklch(82% 0.070 240)` | `oklch(50% 0.080 240)` | info / computing chip border |

### Accent (marketing / hero)

`--accent: oklch(62% 0.20 285)` (violet) for marketing pages; never used as a chrome accent inside the app to avoid competing with role colours.

### Focus ring

`--focus-ring: var(--info)` plus `--focus-ring-offset: 2px`. Decoupled from
`--accent` so the marketing-only rule above stays inviolate. Used by every
keyboard-focusable chrome element (close buttons, tabs, resize handles).

## Spacing scale

Tailwind defaults (0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24). Stick to these. Don't introduce custom values mid-component.

Block-specific dimensions:

| Variable | Value |
|---|---|
| Block min-width | 180 px |
| Block padding | 12 px |
| Block radius | 10 px |
| Handle radius | 6 px |
| Handle hit area | 18 px (transparent extension) |
| Edge stroke width | 1.5 px (default), 2 px (selected), 2.5 px (active flow) |
| Canvas grid spacing | 24 px (dot 1 px) |

## Iconography

**Lucide** for chrome icons. **Custom inline SVG** for math glyphs (matrix brackets, summation signs, etc.) — built once into a `MathGlyph` component.

Icon size scale: 14 / 16 / 20 / 24 px. Stroke width 1.5 px.

## Elevation

Three levels only:

```
--shadow-1: 0 1px 2px oklch(0% 0 0 / 0.04), 0 1px 1px oklch(0% 0 0 / 0.02);
--shadow-2: 0 2px 6px oklch(0% 0 0 / 0.06), 0 1px 2px oklch(0% 0 0 / 0.03);
--shadow-3: 0 8px 24px oklch(0% 0 0 / 0.08), 0 2px 8px oklch(0% 0 0 / 0.04);
```

`shadow-1` for blocks at rest. `shadow-2` on hover. `shadow-3` for floating panels and dropdowns. Nothing higher.

## Voice for marketing copy

- Direct, technical, slightly understated. Closer to Linear's voice than Stripe's.
- Avoid: "powerful", "delightful", "magical", "AI-powered" (it isn't — math is exact, AI only narrates).
- Lead with what the user does, not what the tool is.

Example tagline candidates (use one, refine over time):
- "Build mathematics, block by block."
- "Compose, visualize, understand."
- "A canvas for mathematical thinking."

## Motion tokens

```
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--spring-default: { mass: 1, stiffness: 280, damping: 26 };
--duration-instant: 80ms;
--duration-fast: 180ms;
--duration-default: 240ms;
--duration-slow: 380ms;
```

## What's *not* in the brand

- No mascot, no character, no anthropomorphization.
- No gradient backgrounds in chrome (gradients allowed only in marketing hero and OG images).
- No drop shadows beyond the three elevation tokens.
- No emoji in product copy. (Emoji acceptable in user-generated content like graph titles.)
