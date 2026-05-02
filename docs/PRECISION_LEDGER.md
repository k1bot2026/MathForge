# Precision Ledger

Per `docs/TESTING.md`, when a precision-related bug is found and fixed,
add an entry below recording the issue, the fix, the regression test,
and any ε bound that changed. Newest first.

## Entry format

```
## YYYY-MM-DD — short title

- **Block**: `domain.id`
- **Symptom**: what looked wrong from the user's POV.
- **Root cause**: where the precision was lost (math.js default, BigNumber
  scale, Fraction simplification, IEEE rounding, …).
- **Fix**: how we addressed it.
- **Test**: which spec pins the regression.
- **Bound change**: ε before → ε after (if applicable).
```

---

_No entries yet._ Phase 0 ships only an integer-matmul smoke test, with
no possibility of precision loss. The first real entry is expected when
Phase 1's `la.matvec` / `la.matmul` cross-engine SymPy diff tests start
running.
