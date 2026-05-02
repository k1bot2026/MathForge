# ADR 0002: Use fflate (deflate) for URL-sharing compression in Phase 1

- **Status**: Accepted
- **Date**: 2026-05-02
- **Deciders**: k1bot

## Context

`docs/ARCHITECTURE.md` specifies the URL-sharing pipeline as:

> A graph encodes to JSON, then **zstd**-compressed and base64url-encoded
> into the URL hash for small graphs (≤ ~5 KB compressed).

Phase 1 ships URL sharing as a deliverable. The intent of the spec is
*"compressed enough to fit a non-trivial graph in a URL"*, with zstd
named as the compression algorithm.

zstd in the browser is only available via WebAssembly (`@bokuweb/zstd-
wasm`, `zstd-codec`, similar). Adopting that costs:

- ~50–80 KB additional bundle for the wasm binary;
- async initialisation (`await zstd.init()` before first encode);
- a non-trivial first-class `init()` to wire through React/Next.

The Phase-1 PoC graph is at most a handful of nodes. Measured: a
25-node `core.constant` graph encodes to **<2 KB** with deflate level 9
— well inside the 5 KB target.

## Decision

Phase 1 ships URL sharing on **fflate@0.8.2** using its `deflateSync` /
`inflateSync` APIs (gzip-compatible deflate without checksum overhead).
fflate is ~10 KB minified, pure JavaScript, sync-only, and zero-config.

The serialised payload carries `schemaVersion: 1`. When the graph
shape changes incompatibly, bump the version and add a migration
under `src/lib/migrations/`.

## Consequences

**Positive**

- Tiny bundle delta vs. zstd-wasm.
- Sync API — no `await initWasm()` ceremony in the URL hook.
- Hits the 5 KB target with current Phase-1 graph sizes.

**Trade-offs**

- Compression ratio is worse than zstd. For graphs with lots of
  repetitive payloads (e.g. large duplicate matrices), zstd would shave
  a noticeable percentage. Not an issue at the Phase-1 PoC scale.

**Re-evaluation trigger**

When typical user graphs cross ~3 KB encoded, or when `viz.histogram`/
similar blocks start carrying baked-in sample arrays in their params.
At that point, swap fflate for a zstd-wasm adapter behind the same
`encodeGraph` / `decodeGraph` interface — the codec module is the
only place that needs to know.

## Alternatives considered

1. **`zstd-wasm` (per spec).** Rejected for Phase 1 due to the bundle +
   async-init cost relative to the gain on tiny graphs.
2. **Browser-native `CompressionStream` (gzip).** Zero-dep but
   stream-based — wrapping it in a sync-flavoured codec means an extra
   pump-the-stream-to-completion adapter per call. Stays on the table
   for Phase 2 if we want to drop fflate.
3. **No compression — JSON → base64url directly.** Hits the 5 KB
   target only for trivial graphs; rejected.

## References

- `docs/ARCHITECTURE.md` ("Persistence and sharing" section).
- `src/lib/graph-codec.ts` (the implementation this ADR documents).
- `package.json` (`fflate@0.8.2`).
