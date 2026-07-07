## Summary

<!-- What changed and why -->

## Test plan

- [ ] `bun test` passes for touched packages
- [ ] `tsc --noEmit` passes for touched packages

## Test quality (if this PR touches `*.test.ts`)

- [ ] No `setTimeout` without asserting an async outcome
- [ ] No magic inventory counts (`toHaveLength(N)`) without a derived expected set
- [ ] No `toBeDefined()` / `not.toThrow()` as the sole assertion
- [ ] New built-in registration → `TYPE_MANIFEST` parity test updated
