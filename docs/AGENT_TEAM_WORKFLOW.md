# Agent Team Workflow

How this project uses a keep-working multi-agent session to execute phase work. Read this if you are setting up a new phase session or if you want to understand why the `.keep-working/` directory exists.

## Overview

A **keep-working session** runs a small team of specialized agents concurrently against a shared backlog. The lead agent orchestrates task dispatch; worker agents pull tasks, execute them atomically, and report completion. Sessions are designed to be resumable: if an agent runs out of context, it reads the state directory and continues.

The pattern scales well for projects with clear role boundaries: one agent writing math code, one testing it, one documenting it.

## Team structure for MathForge

| Role | Agent ID | Responsibility |
|---|---|---|
| Lead | team-lead | Backlog management, task dispatch, cycle coordination, unblocking |
| Developer | `kw-developer` | Implementing blocks, engine features, migrations |
| Tester | `kw-tester` | Property tests, SymPy fixture generation, cross-engine test files, arbitraries |
| Docs-writer | `kw-docs-writer` | README, CHANGELOG, inline docs, architecture docs, taxonomy, testing guides |

The lead runs at higher context (Opus); workers run at Sonnet.

## The `.keep-working/` directory

```
.keep-working/
├── config.json       # team name, roles, model assignments, workflow settings
├── BACKLOG.md        # single source of truth for task status (lead edits only)
├── SESSION-LOG.md    # append-only log of cycle events and TASK DONE messages
├── PROGRESS.md       # running totals: tasks completed, tests added, files touched
└── STATE.md          # current cycle state, who is working on what
```

### config.json

Configures the team. Key fields:
- `roles.assignments` — which agent specializations run in this session.
- `workflow.commit_per_task` — one atomic commit per task; no batching.
- `workflow.quality_gates` — agents must run the quality gate before reporting done.
- `workflow.min_tasks_per_cycle` — minimum tasks the lead dispatches per cycle.
- `tools.custom_agents` — the agent IDs active in this session.

### BACKLOG.md

The backlog is the **only** task authority. Rules:
- Only the lead agent edits BACKLOG.md.
- Worker agents read it to understand task context but never modify it.
- Tasks are marked `[x]` when the lead confirms completion via `SESSION-LOG.md` entries.
- Priority bands: Critical → High → Medium → Low.
- Each task names its owner (`[developer]`, `[tester]`, `[docs-writer]`), the acceptance criteria, and any dependencies.

### SESSION-LOG.md

Append-only. Every `TASK DONE` and `CYCLE DONE` message from worker agents lands here. The lead reads it to update BACKLOG.md and seed the next cycle. Provides a full audit trail of what shipped and when.

## Dispatch protocol

### Lead → worker

The lead sends tasks via `SendMessage` with:
1. A priority-ordered list of 5 tasks for the cycle.
2. Any dependency notes (e.g. "blocked until developer ships la.vector").
3. The quality gate requirements for this cycle (docs-only vs. full test+build).
4. Operating rules reminder if anything changed.

### Worker → lead

Workers report with `SendMessage`:
- `TASK DONE` after each atomic task: task name, commit SHA, quality gate result.
- `CYCLE DONE` after all tasks are complete: full list of completions, additional fixes (Rule 1–3 from the docs-writer deviation rules), idle work, files touched, any blocking issues found.

The lead CYCLE DONE message triggers the next dispatch.

## Atomic-commit discipline

One task = one commit. Format:
```
<agent-id>: <verb> <what>
```

Examples:
- `kw-developer: add la.transpose block with involution property tests`
- `kw-tester: add SymPy fixture for la.det multiplicativity`
- `kw-docs-writer: document pnpm check:fixtures guard in TESTING.md`

Every commit is pushed to `origin main` immediately. No commit batching; no force-pushes. This keeps the branch always green and reviewable by all agents concurrently.

## Quality gate

Before every TASK DONE report, run the applicable checks:

**Docs-only changes:**
```bash
pnpm typecheck && pnpm lint
```

**Code changes (any .ts/.tsx file touched):**
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Run `pnpm format` before every commit to avoid Biome formatter drift causing lint failures in subsequent agents' runs.

## Idle work

When a worker's assigned tasks are exhausted, it does not wait for the next dispatch. It runs self-directed improvements within its role:
- **Developer idle:** bug fixes, technical debt in active code paths.
- **Tester idle:** extend fixture coverage, add edge-case arbitraries, improve test diagnostics.
- **Docs-writer idle:** fix outdated documentation (Rule 1), add missing documentation for exported symbols (Rule 2), fix broken doc tooling (Rule 3).

All idle work is reported in the CYCLE DONE message alongside assigned tasks.

## Resuming a session after context exhaustion

If an agent runs out of context:
1. Read `SESSION-LOG.md` for the most recent TASK DONE / CYCLE DONE entries.
2. Read `BACKLOG.md` to find the next unchecked task in your role.
3. Read the relevant source files before doing any work.
4. Continue from where the previous context left off.

The lead resumes by reading `STATE.md` and `SESSION-LOG.md`, then dispatching the next cycle.

## Role selection for math projects

The three-role split used here (developer / tester / docs-writer) works well for projects with:
- A type-system-first architecture (developer and tester can work independently once types are agreed)
- Gold-standard cross-checks (SymPy fixture workflow separates fixture generation from test authoring)
- A large surface area of documentation that would otherwise be deferred

For a statistics-heavy phase (Phase 3), consider adding a fourth agent (`kw-stats-specialist`) for the SymPy statistical distribution work, since that work is more research-intensive than mechanical.

## Session configuration for a new phase

1. Update `config.json` → `phase_context.current_phase`.
2. Seed `BACKLOG.md` with the new phase's High-priority tasks.
3. Lead sends a cycle kickoff message to each worker agent with the first 5 tasks.
4. Workers begin immediately; lead monitors `SESSION-LOG.md` for TASK DONE reports.

See `docs/ROADMAP.md` for phase goals and exit criteria.
