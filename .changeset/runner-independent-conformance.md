---
'@schema-engine/forms': patch
---

The form state container conformance suite no longer depends on Vitest, so `vitest` is no longer a peer dependency. Pass your runner's `describe` and `test`: `formStateContainerConformance(createStore, { describe, test })` works with Vitest, Jest, Bun and `node:test`.
