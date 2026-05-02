# Project Vision

## One-sentence pitch

**MathForge is a visual canvas where you compose mathematical formulas, methods, and algorithms by connecting type-safe blocks — with live visualization and per-step "explorable" explanations of what changes and why.**

## The problem

Mathematical concepts at university level (linear algebra, statistics, calculus, and beyond) are dense, abstract, and often presented as static formulas in textbooks. Three pain points compound:

1. **Hard to internalize.** Reading a derivation is not the same as building one. Learners can recite without understanding.
2. **Hard to explore.** Existing tools either compute (Wolfram Alpha — black box) or visualize (Desmos, GeoGebra — single-formula focus). Few let you *compose* multi-step pipelines.
3. **Hard to invent.** Designing a new method or testing a hypothesis requires either pen-and-paper rigour or notebook-level coding. There is no playful, low-friction middle ground for adults.

## The proposition

A node-based editor where every mathematical object — scalar, vector, matrix, random variable, function, distribution, expression — is a typed, draggable building block. Blocks connect through shape-checked handles (`Matrix<m,k> · Matrix<k,n> → Matrix<m,n>`). The graph evaluates reactively, results render as live visualizations, and each block carries a four-tab explanation: **what / why / effect / impact**.

The combination is novel: node-based composition exists in 3D (Grasshopper, Houdini), VFX, and audio (Max/MSP); none target adult mathematical learning with a real type system, multi-domain coverage, and a constructionist UX.

## Target users

Three concentric audiences, in priority order for v1:

1. **University STEM students** wrestling with abstract math in the curriculum. The first user is the founder.
2. **Educators** preparing visual explanations or worksheets. They use the tool to build, then share a read-only URL.
3. **Quantitative professionals** sketching ideas before coding them. Researchers, data scientists, ML engineers prototyping without an IDE.

Explicitly **not for**: K–12 students (different pedagogy, different aesthetic), proof-oriented mathematicians (use Lean), or casual numerate users wanting a calculator (use Wolfram Alpha or Soulver).

## Core principles

- **Correctness over convenience.** A wrong answer is worse than no answer. Symbolic-exact wherever possible; numerical results clearly marked.
- **Constructionism.** You learn by building a public artefact. The graph *is* the knowledge.
- **Multiple representations, simultaneously.** Algebraic (LaTeX), numeric (concrete value), graphic (plot), verbal (one-sentence explanation). Side-by-side, not behind tabs unless space demands.
- **Reduce extraneous load, increase germane load.** Minimal chrome, generous white space, consistent colour semantics, animations only where they reveal causality.
- **Adult professional aesthetic.** Linear-grade restraint with 3Blue1Brown-grade animation craft. No badges, no confetti, no comic sans.
- **Discoverable depth.** A novice can drag two blocks together and learn something in 30 seconds. An expert can build a 200-node Bayesian inference pipeline.
- **Open by default.** Every graph has a sharable URL. Remixing is one click.

## What success looks like (one year out)

- A student can build a working eigendecomposition pipeline from scratch in under five minutes, understand each step, and explain it back.
- A professor can prepare a 30-minute lecture as a single shareable graph and walk through it with the Construction Protocol replay.
- A researcher prototyping a new method (e.g. a custom MCMC variant) can express it in 20 minutes and share it as a reusable composite block.
- The block library covers all of IB0602 (linear algebra + statistics), all of single-variable calculus, and at least one composite-block third-party contribution.

## What success does NOT look like

- A million users on a freemium tier (out of scope, possibly forever).
- "AI does the math for you" — the LLM never touches the calculation; it can only narrate.
- A clone of GeoGebra, Desmos, or Mathcad. We borrow patterns, we do not duplicate features.

## Anti-goals

- Replacing pen-and-paper for proofs.
- Real-time multiplayer editing (read-only sharing is enough for v1).
- Mobile authoring (mobile = read-only).
- Custom DSL or scripting language. The graph is the language.
