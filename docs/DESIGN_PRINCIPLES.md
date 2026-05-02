# Design Principles

The aesthetic target: **Linear-grade restraint with 3Blue1Brown-grade animation craft.** Quiet, professional, and adult — but with subtle playfulness that rewards attention.

## Core principles

### 1. Calm by default, alive on interaction

The canvas at rest looks like a notebook page: white space, a few blocks, restrained colour. It comes alive when the user interacts: edges propagate light when values change, blocks gently scale on hover, type-mismatched handles shake.

Animations have a job. If you can't name what an animation reveals (causality, state change, error, success), don't ship it.

### 2. Single accent per role

Every category of block has exactly one hue family (see `docs/BRAND.md`). Within a family, vary saturation and lightness for sub-types. Never introduce off-palette hues for "visual interest".

### 3. Multiple representations, simultaneously

When showing a mathematical object, show as many representations as fit:
- **algebraic** (LaTeX via KaTeX),
- **numeric** (a concrete value or sample),
- **graphic** (plot, vector, distribution),
- **verbal** (one-sentence explanation).

Side-by-side beats tabbed when space allows. Tabs only when the user explicitly wants to dig into one representation.

### 4. Reduce extraneous load, increase germane load

- White space is information. Don't fill it.
- Consistent positions for inputs/outputs (left/right of a node).
- One font family for UI, one mono for math, no exceptions.
- Don't decorate. If a UI element doesn't carry information or affordance, remove it.
- The "explanation" panel does the heavy didactic lifting; the canvas stays clean.

### 5. Discoverable depth

A first-time user should learn something within 30 seconds of dropping the first block. An expert user should still find depth after 100 hours.

Achieve this by:
- Empty states that invite ("drop a Matrix here"), don't lecture.
- Hover-tooltips that hint at the next step.
- Inspector panels that progressively disclose advanced parameters.
- Templates as first-class citizens (see `docs/PROJECT_VISION.md`).

### 6. Mastery, not gamification

We do not award points, badges, levels, or streaks. We do reward:
- **Aesthetic delight** — beautiful animations and layouts as recognition for completing a meaningful pipeline.
- **Competence cues** — type validation gives green confirmation; a fully-typed graph gets a subtle "consistent" indicator.
- **Autonomy** — every block is editable; every parameter is exposed; the user is in control.
- **Sharing** — finished work has a URL. The graph itself is the trophy.

## Layout grammar

- **Canvas**: full-bleed, infinite-pan, dotted-grid background at low contrast.
- **Left rail (collapsed by default)**: block library, searchable, organized by domain.
- **Right rail (slide-in on selection)**: inspector with parameters, then explanation tabs.
- **Bottom bar (when in replay mode)**: Construction Protocol timeline.
- **Top bar**: minimal — file/share/settings, plus a breadcrumb or graph title.

Default is canvas-only. Rails open with intent.

## Animation grammar

| Trigger | Animation | Purpose | Duration |
|---|---|---|---|
| Drop block onto canvas | Scale 0.9 → 1, fade in, soft shadow ramp | "It landed" | 180 ms |
| Connect two handles | Edge draws from source to target with easing | "They are linked" | 220 ms |
| Value propagates | Brief pulse along edge in accent colour | "Data flowed" | 280 ms |
| Type mismatch on hover | Target handle shakes ±2 px; tooltip fades in | "This won't fit, here's why" | 250 ms shake, 100 ms tooltip |
| Block evaluates | Subtle border-glow, then settles | "Computed" | 200 ms |
| Block errors | Red border flash, then steady red border + icon | "Look here" | 300 ms flash |
| Open inspector | Slide from right, content fades 60 ms behind | "Detail view" | 220 ms |
| Replay step advance | Construction Protocol scrubs; affected nodes glow in order | "Watch what happened" | 300–600 ms per step |

Use Framer Motion. Default easing: `ease-out` for arrivals, spring (mass: 1, stiffness: 280, damping: 26) for manipulation. Never animate everything; the canvas at rest should be still.

## Empty states & onboarding

- **First-launch**: a single placeholder block on the canvas with a callout: "Try dragging this onto the grid."
- **Empty inspector** (no selection): one-sentence hint about what selecting does.
- **No blocks of this kind in library**: don't show an empty section; hide it.

The first session should produce one *complete* pipeline (e.g. matrix · vector → plotted result) in under three minutes. Validate this with users.

## Accessibility

- WCAG AA minimum: 4.5:1 text, 3:1 large text. Tested in both themes.
- All interactive nodes are keyboard-reachable. Tab order matches visual order.
- All animations respect `prefers-reduced-motion`. Provide non-animated alternatives.
- Screen reader: every block announces "Block: <label>, inputs: <n connected>, outputs: <m>, status: <ok|error>".
- Colour is never the only signal. Errors also have an icon and a border style.

## Voice and tone

The four explanation tabs (`what / why / effect / impact`) follow strict rules:

- **what**: one sentence, present tense, defines the operation. Not a textbook quote — phrased as a colleague would explain it.
- **why**: one sentence, the *intuition* — what mental model is at play.
- **effect**: data-driven, references the actual current inputs and outputs.
- **impact**: forward-looking, references downstream consequences in this graph.

No exclamation marks. No "Don't worry, it's actually simple!" patronizing. No emoji in default copy.

Examples (good):
- *what*: "Multiplies two matrices entry-by-entry as dot products of rows and columns."
- *why*: "Composes two linear transformations into one."
- *effect*: "Combined a 3×4 matrix with a 4×5 matrix to produce a 3×5 matrix; determinant is 12."
- *impact*: "Downstream eigendecomposition will see a 3×5 (non-square) matrix — eigenvalues only defined for square inputs; consider a transpose-multiply."

Examples (bad):
- ❌ "Matrix multiplication is one of the most important operations in linear algebra!"
- ❌ "Hey there! Let's multiply some matrices 🎉"
- ❌ "A·B is computed by multiplying A by B." (tautology)

## What to avoid

- Glassmorphism, neon gradients, busy backgrounds, drop-shadow stacks. Once was fashion; now it's noise.
- Skeuomorphism that doesn't earn its weight. A subtle paper texture on the canvas: maybe. A 3D bevelled "compute" button: never.
- Excess micro-copy in the canvas itself. Explanations live in the panel.
- Motion for motion's sake. If you remove the animation and information loss is zero, remove the animation.
