---
'@schema-engine/forms': minor
'@schema-engine/forms-react': minor
'@schema-engine/forms-radiant': minor
---

Replace the fluent authoring API (`FormComposer` / `FormConfigBuilder`) with `createFormEngine` and `defineForm`, expose the normalized form/element contracts, share field-tree walking and path helpers in `@schema-engine/forms`, and render step fields through `FormElements` so nested defaults and validation use the same composed paths as the renderer.
