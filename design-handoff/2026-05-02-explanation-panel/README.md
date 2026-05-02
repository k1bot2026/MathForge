# Explanation Panel — design handoff

**Date** 2026-05-02
**Feature** Right-rail Explanation Panel (four tabs: what / why / effect / impact)
**Targets** `src/editor/inspector/explanation-tabs.tsx`, `src/editor/inspector/inspector-panel.tsx`, plus a new resize/persistence hook
**Tokens** All from `docs/BRAND.md` and `src/app/globals.css` — see `tokens-used.md`

---

## 1. What this delivers

A static spec for the four-tab explanation panel that slides in from the right when a block is selected on the canvas. The handoff covers:

- **Anatomy** — one annotated reference frame (light theme, value state).
- **Five result states** — `computing`, `value`, `warning` (precision loss), `error` (type mismatch), `unknown-block` fallback. Each state shown in **light** and **dark** themes.
- **Tab persistence** — a paired example demonstrating that the active tab survives a selection change.
- **Spec callouts** — width, slide-in motion, tab-state scope, contrast.
- **Inline math** placeholders rendered as `$$…$$` per the constraint that KaTeX is implemented in code.

Open `prototype/index.html` directly in a browser. No build step, no JS framework — vanilla HTML/CSS plus a small inline `<script>` that templates the state grid so the markup stays compact and theme variants don't drift.

---

## 2. Design intent

### Why this layout

The existing `inspector-panel.tsx` already follows the pattern *params first, explanation second*. This handoff keeps that shape but treats the explanation tabs as the panel's center of gravity — they're what the user came for. The header reads as **block identity** (label + role dot + id meta), the tab bar is one row tall, and the body is a single calm paragraph. There is no second pane, no "Learn more" link, no marketing surface inside the panel. That's deliberate: per `DESIGN_PRINCIPLES.md` §4 *("the 'explanation' panel does the heavy didactic lifting")*, the panel itself should feel like a notebook margin note, not a feature.

### State as a glanceable signal, not a billboard

The brief asks for five visually distinct states. The temptation is large coloured banners; that breaks §1 *("calm by default, alive on interaction")* and §2 *("single accent per role")* — a yellow banner inside a violet operation block muddies the role mapping. Instead, state is communicated through **three layered signals**, none of which is colour-only:

1. A **state chip** in the panel header (`computing` / `value · ok` / `precision loss` / `type mismatch` / `unregistered`). Mono caps, dot indicator, tinted background.
2. A **content treatment** in the body — skeleton lines for `computing`, tinted left rail for `warn`, full callout block for `error`, neutral muted prose for `unknown`.
3. **Block-side feedback** stays inside `block-node.tsx` (red border on error per the existing animation grammar table). The panel echoes it; it doesn't re-implement it.

This satisfies §Accessibility *("colour is never the only signal")* without requiring red-flash banners that would feel alarming next to one-sentence prose.

### Voice, in practice

The four tabs follow the rules in `DESIGN_PRINCIPLES.md` §Voice and tone:

- **what** — definition. Present tense. Example: *"Multiplies two matrices: each entry of A·B is a dot product of a row of A and a column of B."*
- **why** — intuition. *"Composes two linear transformations into one."*
- **effect** — references the live inputs and output. Geist Mono tabular numerals for raw numbers, dedicated `.shape` span for `m×n` callouts, `$$…$$` placeholders for inline math.
- **impact** — forward-looking. *"Downstream blocks see this as a 3×5 real matrix."*

In the warning state, the *impact* tab leads with consequence (smallest eigenvalue rounds to zero in float64) and gives a concrete next-block recommendation. No exclamations; no "don't worry"; no emoji.

### Slide-in and content fade

Per the brief and the animation grammar table:

- Panel slides in from `translateX(16px) → 0` with `opacity 0 → 1`, **220ms**, `ease-out` (`cubic-bezier(0.22, 1, 0.36, 1)`).
- The body fades in at **opacity 0 → 1**, **180ms** with a **60ms delay** behind the slide.
- Both animations are wrapped in the project-wide `prefers-reduced-motion: reduce` block, which sets durations to `0.01ms` — content appears instantly without translate, matching `globals.css`.
- The skeleton shimmer and the computing-chip pulse are likewise no-op under reduced motion (handled with explicit per-keyframe overrides, since the global block only kills CSS transitions, not keyframe animations).

The static handoff renders the **end state** — animation classes (`is-animating-in`) are documented but not auto-applied so reviewers see the panel as it sits at rest. Storybook stories should toggle the class for the "Open" interaction story.

### Tab persistence

The active tab is **workspace-scoped**, not selection-scoped. Concretely, this means the tab id (`'what' | 'why' | 'effect' | 'impact'`) lives on `useGraphStore` (or a dedicated `useUiStore`), keyed off the workspace, **not** off `node.data`. Behaviour:

- User opens block A, switches to *effect* → user selects block B → panel still on *effect*.
- If block B's definition omits `explain.effect` (per `BlockDefinition.explain` in `src/blocks/types.ts`), the panel falls back to the leftmost available tab **without** mutating the persisted preference. If the user then selects block C which does have `effect`, they're back on *effect*. This matches `explanation-tabs.tsx`'s existing local-state logic (`tabs.includes(tab) ? tab : tabs[0]`); the change is hoisting that state up.

Persisting *across reloads* is intentionally out of scope — the panel always re-opens on *what*, the safest default for a returning user. Flag if that's wrong.

### Resize handle

- **Position**: left edge, 6px hit area, 1.5px visible affordance only on `:hover` / `:focus-visible`.
- **Range**: 320–520px, clamped in JS. Default 380px (centre of the 360–420 range from the brief).
- **Persistence**: workspace-scoped (same key as the tab state).
- **Keyboard**: handle is `tabindex="0"` with `role="separator"`, `aria-orientation="vertical"`. Arrow-left / arrow-right adjust width by 16px steps on focus.

---

## 3. Decisions worth a code-review eye

| # | Decision | Rationale | What to push back on |
|---|---|---|---|
| 1 | Panel default width is **380px**, not 360 or 420. | Sits dead-centre of the brief's range; gives ~64ch for a one-sentence paragraph at 14px without becoming a sidebar. | If the canvas often holds wide blocks (matrices > 4 cols), 360 may help. |
| 2 | A persistent **value strip** at the bottom of the panel, hidden in non-value states. | Lets the user glance at the current output without rotating tabs — a "third representation" per principles §3, but compact. | Could be redundant with the in-node preview; remove if Storybook A/B says so. |
| 3 | **State chip in header**, not at the top of the body. | Header is the panel's identity surface; the chip sits beside the role dot and id, reading as metadata. The body stays focused on prose. | If users miss the warning chip, promote it into the body as a banner. |
| 4 | **Unknown-block** fallback is neutral, not alarming. | The graph still serializes; the block may load when an extension is installed. Treating this as an error confuses the user. | Confirm with the founder that we don't want a "Find this block" CTA. |
| 5 | Tab underline is `--fg`, not `--accent`. | `--accent` is reserved for marketing per `BRAND.md`. The active tab's underline reads as text emphasis, not as a coloured chrome accent. | If the contrast feels too subtle, the right answer is a heavier weight on the active label, not a colour change. |
| 6 | **Close button** kept lowercase, mono caps, matching the existing inspector. | Pattern continuity over refresh. | None expected. |

---

## 4. Open questions about tokens

These are **proposed** additions to `BRAND.md`. None are introduced in the prototype CSS — all are flagged here per the workflow doc rule *"new tokens go in `docs/BRAND.md` first."*

### Q1 — Tinted-background mixing for status chips

The warning and error chips need a faint tinted fill (currently approximated with `color-mix(in oklch, var(--warn) 6%, var(--surface))` at the CSS layer). If this pattern recurs (it will — the Type-mismatch tooltip on canvas already wants it), suggest naming the tint:

```
--warn-soft:  color-mix(in oklch, var(--warn)  6%, var(--surface));
--error-soft: color-mix(in oklch, var(--error) 6%, var(--surface));
--info-soft:  color-mix(in oklch, var(--info)  6%, var(--surface));
```

These are light enough that they pass AA against `--fg` body text. Alternative: define them as raw OKLCH values per theme rather than mix, to avoid runtime `color-mix` (Safari has lingering quirks).

### Q2 — Border-tint for status surfaces

Same pattern, for the 30% mix used on the chip and error-block borders:

```
--warn-border-soft:  color-mix(in oklch, var(--warn)  30%, var(--border));
--error-border-soft: color-mix(in oklch, var(--error) 30%, var(--border));
--info-border-soft:  color-mix(in oklch, var(--info)  30%, var(--border));
```

### Q3 — Skeleton shimmer track

The skeleton uses `--surface-2` as the base and a `color-mix` highlight. If skeletons appear in more places (Storybook will produce a few), worth canonising:

```
--skeleton-base:      var(--surface-2);
--skeleton-highlight: color-mix(in oklch, var(--fg) 6%, var(--surface-2));
```

### Q4 — Focus ring token

`globals.css` has no `--focus-ring` token; the prototype uses `outline: 2px solid var(--accent)`. That works, but it pulls `--accent` (marketing-only per `BRAND.md`) into chrome. Suggest:

```
--focus-ring: var(--info); /* or a dedicated value */
--focus-ring-offset: 2px;
```

This is the most likely place where I'm bending a `BRAND.md` rule — please decide before implementation.

### Q5 — Mono "data" colour

For raw numbers (`12`, `2.3 × 10⁻¹⁵`, `[3.000, -2.000]`) the prototype uses `var(--fg)` to keep weight equal to the prose. Some teams prefer a slight de-emphasis (e.g. `--data-fg: oklch(35% 0.015 240)` light / `oklch(85% 0.012 240)` dark). Open question — defaulting to `--fg` for now.

### Q6 — Resize-handle hover affordance

Currently `var(--fg-faint)` for the visible 1.5px line on hover/focus. No new token needed if `--fg-faint` is the right answer; flagging in case there's a separate "interactive scrim" colour planned.

### Q7 — Dusty solid-fill block palette (`--block-*-fill` / `--block-*-fg`)

The current `--role-*-fill` tokens were tuned for **tinted-card surfaces** behind text in the inspector — high lightness, low chroma, no contrast guarantee against block bodies. The canvas needs a separate, slightly more saturated-but-still-dusty register: solid colour blocks (no border) with auto-contrast text, sitting in the Notion-callout zone.

Introducing **two parallel ramps**, one fill + one foreground per role, in both themes:

```css
:root[data-theme="light"] {
  /* Solid block bodies — dusty, no border. */
  --block-source-fill:     oklch(80% 0.030 235);  /* dusty sky      */
  --block-operation-fill:  oklch(78% 0.035 285);  /* dusty violet   */
  --block-function-fill:   oklch(82% 0.040 80);   /* dusty amber    */
  --block-visualizer-fill: oklch(80% 0.035 155);  /* dusty emerald  */
  --block-stochastic-fill: oklch(80% 0.035 15);   /* dusty rose     */
  --block-control-fill:    oklch(82% 0.012 240);  /* dusty slate    */

  /* Auto-contrast text — dark on light fills. */
  --block-source-fg:     oklch(28% 0.04 235);
  --block-operation-fg:  oklch(28% 0.05 285);
  --block-function-fg:   oklch(30% 0.06 80);
  --block-visualizer-fg: oklch(28% 0.05 155);
  --block-stochastic-fg: oklch(28% 0.05 15);
  --block-control-fg:    oklch(30% 0.015 240);
}

:root[data-theme="dark"] {
  /* Mid-low lightness so dusty-ness reads as muted, not "dim primary". */
  --block-source-fill:     oklch(38% 0.040 235);
  --block-operation-fill:  oklch(36% 0.045 285);
  --block-function-fill:   oklch(40% 0.055 80);
  --block-visualizer-fill: oklch(38% 0.050 155);
  --block-stochastic-fill: oklch(38% 0.050 15);
  --block-control-fill:    oklch(34% 0.012 240);

  --block-source-fg:     oklch(92% 0.02 235);
  --block-operation-fg:  oklch(92% 0.03 285);
  --block-function-fg:   oklch(94% 0.04 80);
  --block-visualizer-fg: oklch(92% 0.03 155);
  --block-stochastic-fg: oklch(92% 0.03 15);
  --block-control-fg:    oklch(92% 0.01 240);
}
```

**Why a parallel ramp instead of remixing `--role-*-fill`:**
- The two surfaces have different jobs. Card backgrounds in the inspector sit behind ~14px body text and need to be *quiet enough to disappear*; canvas blocks are the foreground and need to be *quiet enough to coexist with five neighbours*. One token can't pull both off.
- Separating the ramps means designers can tune one without breaking the other (e.g. nudge inspector cards lighter for AAA without dragging the canvas with them).
- The existing `--role-*-border` token (already a punchier OKLCH chroma per role) still drives the **inspector header dot**, so role identity carries from canvas → inspector without recolouring.

**Contrast budget** (light theme, AA = 4.5 for body text):
| Role | Fill L | FG L | ΔL | Contrast |
|---|---|---|---|---|
| source | 80 | 28 | 52 | ~7.0 ✓ |
| operation | 78 | 28 | 50 | ~6.6 ✓ |
| function | 82 | 30 | 52 | ~6.9 ✓ |
| visualizer | 80 | 28 | 52 | ~7.0 ✓ |
| stochastic | 80 | 28 | 52 | ~7.0 ✓ |
| control | 82 | 30 | 52 | ~6.9 ✓ |

All comfortably above AA at 13–14px body weight. Dark theme ramps mirror the relationship (~54 ΔL).

**Implementation note for the eng review:** the prototype previously used `--role-*-fill` + `--role-*-border` directly on `.node-stub`. It now uses `--block-*-fill` / `--block-*-fg` with no border. If `BRAND.md` adopts these tokens, no further CSS change is needed. If the founder prefers re-tuning the existing `--role-*-fill` instead of adding a parallel ramp, we lose the ability to make canvas / inspector independently legible — flag this trade-off explicitly before going that route.

---

## 5. What Claude Code should build

Per `CLAUDE_DESIGN_WORKFLOW.md` §6, the implementation session should:

1. **Read this README first.** Compare every token used in `prototype/styles.css` against `globals.css` / `BRAND.md`. If a value mismatches, the source-of-truth in `BRAND.md` wins; update the prototype mentally rather than absorbing the deviation into code. None should mismatch — the prototype copies tokens verbatim from `globals.css`.
2. **Resolve each open question above** with the founder before merging, by either adding the token to `BRAND.md` or replacing the prototype's `color-mix(...)` expression with a stricter token.
3. **Move tab state up** from `useState` in `explanation-tabs.tsx` to a workspace-scoped store slice (`useUiStore.activeExplanationTab`). Keep the existing `availableForTab` fallback so blocks without `effect`/`impact` still work.
4. **Add a panel-level `state: 'computing' | 'value' | 'warn' | 'error' | 'unknown'` discriminator** computed from `EvalResult` plus the precision ledger. Render the chip + body treatment from this single field rather than scattering branches.
5. **Add Storybook stories** matching every state shown here, in both themes, plus one story for the open/close transition (toggle `is-animating-in`) and one for tab persistence across re-mounts. Snapshot tests follow per `TESTING.md`.
6. **Resize handle** is new infrastructure — pull or write a small `useResizable` hook (clamped, persisted, ARIA wired). Do not add a heavyweight library for this.
7. **Note in the PR description** any deviation from the prototype, especially any `BRAND.md` token additions made along the way.

---

## 6. Out of scope

Per the brief and `CLAUDE_DESIGN_WORKFLOW.md`, this handoff does **not** cover:

- React Flow handles, edges, drag — owned by Claude Code.
- KaTeX render path — placeholders shown as `$$…$$`; the implementer wires `react-katex` or whatever the canvas already uses.
- The params form above the tabs (`ParamControl`) — already lives in `inspector-panel.tsx`; unchanged.
- The block library sidebar (separate handoff).
- Mobile / read-only rendering of the panel — `PROJECT_VISION.md` makes mobile read-only; I'd expect the panel to render but be non-resizable on touch. Flag if a separate handoff is wanted.

---

## 7. File map

```
2026-05-02-explanation-panel/
├── README.md                            # this file
├── tokens-used.md                       # every token referenced, with contrast notes
├── prototype/
│   ├── index.html                       # static spec — open in any browser
│   └── styles.css                       # tokens copied verbatim from globals.css
└── screenshots/                         # PNG references for the PR description
    ├── overview.png
    ├── states-light.png
    └── states-warn-error.png
```

---

## 8. Known caveats

Per the workflow doc on Claude Design's research-preview status: I've kept the prototype to a single static HTML + a single static CSS file with no build step. This sidesteps the "save errors in compact view" and "lag on large repositories" issues — the bundle copies cleanly and renders identically without any tooling. No inline comments were used; everything is in this README to avoid the "vanishing inline comments" caveat.
