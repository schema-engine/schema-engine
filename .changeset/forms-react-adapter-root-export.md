---
'@schema-engine/forms-react': minor
---

Re-export `rhfAdapter` from the package root so consumers importing the provider, renderer, and adapter through `@schema-engine/forms-react` resolve one module instance (dev vendoring keeps a single set of form contexts).
