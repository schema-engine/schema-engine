---
'@schema-engine/forms-radiant': major
---

Remove the global engine fallback and Radiant adapter exports. Pass an engine to
`FormRenderer` instead of wrapping it with the removed `FormEngineProvider` or
`FormEngineProviderElement`. Use `FormEngineController` for custom hosts inside a
renderer.
