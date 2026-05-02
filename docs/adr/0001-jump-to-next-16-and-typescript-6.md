# ADR 0001: Jump to Next.js 16 and TypeScript 6 for Phase-0 bootstrap

- **Status**: Accepted
- **Date**: 2026-05-02
- **Deciders**: k1bot

## Context

`CLAUDE.md` and `docs/ROADMAP.md` were drafted pinning the framework
majors at Next.js 15 and TypeScript 5.x. By the time the first commit
of Phase 0 was being written (2026-05-02), both had moved on:

- Next.js **16.2.4** was the latest stable.
- TypeScript **6.0.3** was released 2026-03-17.

Following the documented pins literally would have meant starting the
project on a major that was already n-1 within weeks of the very first
commit, on a doc set that is meant to be the source of truth.

## Decision

Phase 0 ships on **Next.js 16.2.4 + TypeScript 6.0.3**. The tech-stack
list in `CLAUDE.md` was updated in the same commit as the package
pinning (`chore: pin tooling baseline + bump CLAUDE.md to next 16 / ts 6`).

## Consequences

**Positive**

- Newer Turbopack-default Next.js avoids a migration in Phase 1.
- TypeScript 6.0 maintains full backward compatibility with 5.9 per
  Microsoft's release notes; our `strict` + `noUncheckedIndexedAccess`
  + `exactOptionalPropertyTypes` settings continue to work.

**Trade-offs**

- Next 16 introduced breaking changes (synchronous `params` /
  `searchParams` / `cookies()` removed, `middleware.ts` → `proxy.ts`,
  Turbopack default, `next lint` removed). All N/A for Phase 0 (no
  middleware, no dynamic routes, Biome handles lint), but live for
  Phase 1+ when route handlers and middleware appear.
- Zod is at v4 (`zod@4.4.2`) with API changes from v3. No real Zod
  schemas in Phase 0 so no risk; flagged for Phase 1 schema work.
- `baseUrl` is deprecated in TS 6 (removed in TS 7). Our `tsconfig.json`
  uses the `paths`-only form already.
- `exactOptionalPropertyTypes: true` interacts with some library type
  defs that emit `T | undefined` rather than optional fields (e.g.
  Playwright's config — see commit 7 for the conditional-spread pattern).

**Re-evaluation trigger**

End of Phase 1. Revisit if (a) Next 16 surface area causes friction,
(b) React 19.3+ ships and breaks `@react-three/fiber` (declared peer
range `>=19 <19.3`), or (c) TS 7 ships and we want to plan the move.

## Alternatives considered

1. **Stay on the doc-pinned Next 15.2.4 + TS 5.9.3** (the plan's default
   recommendation). Rejected: jumping a major within weeks of release
   was preferred over carrying n-1 from day one in a project that's
   meant to live for years.
2. **Mix: Next 15.2.4 + TS 6.0.3.** Rejected: simpler to bump both
   together under one ADR than to track two staggered upgrade horizons.
3. **Wait to bump until Phase 1.** Rejected: the longer we delay, the
   more code is written against the n-1 surface.

## References

- `docs/PROJECT_VISION.md` (no change required).
- `CLAUDE.md` — tech-stack pin update lives here.
- Plan file `/Users/k1bot/.claude/plans/you-are-starting-ethereal-mist.md`
  (commit 1 message reproduces the deviations called out at the time).
