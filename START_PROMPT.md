# Starting prompt for Claude Code

Open Claude Code in the project root after dropping the bootstrap files in. Run plan mode (`Shift+Tab` twice in Claude Code) and paste **the prompt below** as the first message.

Do **not** let Claude start scaffolding immediately. The prompt is sequenced to force a read-and-analyze pass *before* any code is written.

---

## How to use this prompt

1. Create an empty Git repo and `cd` into it.
2. Drop the bootstrap files (this folder's contents) at the repo root.
3. Run `git init && git add -A && git commit -m "bootstrap: docs"`.
4. Run `claude` in that directory.
5. Switch to plan mode (`Shift+Tab` twice).
6. Paste the prompt below.
7. **Read the resulting plan carefully.** Push back, refine, ask "what if" — until you're satisfied.
8. Only then approve. Claude proceeds with execution in normal mode.

---

## The prompt

> You are starting work on **MathForge**, a visual gamified web application for composing mathematical formulas, methods, and algorithms as type-safe directed graphs of blocks. The repository currently contains only documentation.
>
> **Do not write code yet.** Your job in this first message is to read, analyze, propose, and wait for approval.
>
> ## Step 1 — Read everything in this order
>
> 1. `CLAUDE.md` (master context)
> 2. `docs/PROJECT_VISION.md`
> 3. `docs/ARCHITECTURE.md`
> 4. `docs/BLOCK_TAXONOMY.md`
> 5. `docs/TYPES.md`
> 6. `docs/DESIGN_PRINCIPLES.md`
> 7. `docs/BRAND.md`
> 8. `docs/ROADMAP.md`
> 9. `docs/TESTING.md`
> 10. `docs/CLAUDE_DESIGN_WORKFLOW.md`
> 11. `README.md`
>
> Read each completely. Do not skim.
>
> ## Step 2 — Analyze and surface concerns
>
> After reading, produce a short analysis (≤ 600 words) covering:
>
> - Anything **internally inconsistent** between docs (where one says X and another says Y).
> - Anything **technically risky** with current versions of the tools — Next.js 15 + React 19 + Tailwind v4 + React Flow + Pyodide compatibility, peer dep conflicts, ESM/CJS pitfalls.
> - Anything **missing** that is required before Phase 0 can complete (e.g. an ADR template, a `tsconfig.json` shape, a Biome config baseline).
> - Anything you'd push back on as the implementer (over- or under-specified, ambiguous).
>
> Be direct. Don't soften concerns. The docs are drafts and meant to be challenged.
>
> ## Step 3 — Propose the Phase 0 execution plan
>
> Produce a structured plan to deliver Phase 0 as defined in `docs/ROADMAP.md`. The plan must include:
>
> 1. **File-level scaffold list.** Every file you intend to create or modify, with one-line rationale each. Group by package/area.
> 2. **Tool versions.** Pinned versions for Node, pnpm, Next.js, React, TypeScript, Tailwind, shadcn/ui, React Flow, math.js, Pyodide, Vitest, fast-check, Playwright, Storybook, Biome. State your sources for each pin.
> 3. **Order of operations.** Sequence of git commits you will make, each commit being a coherent unit (e.g. "init + tooling", "tailwind + tokens", "react flow canvas + placeholder", "pyodide worker scaffold", "ci pipeline"). Aim for ≤ 8 commits.
> 4. **Test plan for Phase 0.** What will pass `pnpm test`, what stories will exist in Storybook, what Playwright spec validates "Hello block" renders.
> 5. **CI plan.** GitHub Actions workflow contents (high-level).
> 6. **Open decisions.** Any choice that needs my input before you proceed (e.g. "do you want OG images now or in Phase 1?", "do you want a `docs/adr/` template now?", "Vercel project name?").
> 7. **What you will NOT do in Phase 0.** Explicitly list out-of-scope items (e.g. no real blocks beyond a placeholder, no actual math operations, no Supabase).
>
> ## Step 4 — Wait
>
> Stop. Do not write a single line of project code. Wait for my response. I will either approve, ask questions, or request revisions.
>
> ## Operating principles for this and every future session
>
> - Read `CLAUDE.md` and any docs in `docs/` you haven't read yet before any task. If you've forgotten what's in a doc since last session, re-read it.
> - When uncertain, ask — don't assume.
> - Property tests before implementation for any math.
> - One block per PR; one logical change per commit.
> - Update docs in the same PR that changes underlying reality.
> - Use `<thinking>` blocks for non-trivial reasoning.
> - When you finish a task, summarize what changed, what you didn't touch, and what's next.
>
> Begin Step 1.

---

## Tips for the first session

- **Don't accept the first plan.** Push back. Ask "why React Flow, not Rete?", "what if Pyodide takes 30 s — what's the fallback UI?", "show me the package.json you'd write". Force depth.
- **Force pinned versions.** Drift is the silent killer. Make Claude state where each pin came from.
- **Demand the file list.** If Claude won't enumerate files, you don't have a plan, you have a vibe.
- **Approve commit-by-commit.** "Make commit 1" → review → "make commit 2". Don't approve the whole sequence at once.
- **Watch for invented dependencies.** If a package name appears that wasn't in the doc set, ask why.
- **After Phase 0 lands**, save the conversation, `/clear`, and start fresh for Phase 1 with a new prompt that references this same docs set.

## What good looks like

After your first session, your repo should contain:

- a working Next.js dev server,
- one trivial node on a React Flow canvas,
- pinned tool versions,
- green CI on a single commit,
- a Vercel preview URL,
- updated `docs/ROADMAP.md` if anything changed during execution.

If after one session you have anything more (real math, multiple blocks, Supabase, etc.), the scope grew without your approval. Push back next time.
