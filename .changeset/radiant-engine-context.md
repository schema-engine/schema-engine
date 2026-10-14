---
'@schema-engine/forms-radiant': major
---

Remove the global engine fallback and Radiant adapter exports. Pass an engine to
`FormRenderer`, and use `FormEngineController` for custom hosts inside a renderer.
