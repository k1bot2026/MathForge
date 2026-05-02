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

_No entries yet._ Cross-engine SymPy diff tests are active for `la.matvec`,
`la.matmul`, `la.transpose`, `la.add`, `la.sub`, `la.trace`, and `la.det`
(Phase 1 + Phase 2). All integer-input test cases pass with exact equality.
The first entry here will appear when a floating-point edge case or
precision-propagation bug is found and fixed.
