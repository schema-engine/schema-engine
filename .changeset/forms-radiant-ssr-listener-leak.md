---
'@schema-engine/forms-radiant': patch
---

Avoid attaching `eco:after-swap` listeners during SSR so Radiant's minimal document environment does not leak EventTarget listeners. Document-level installation is idempotent via `ensureDocumentFieldRuleHydrator`.
