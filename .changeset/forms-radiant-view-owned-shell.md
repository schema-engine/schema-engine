---
'@schema-engine/forms-radiant': minor
---

Render forms through a view-owned shell. `FormRenderer` / `FormInstance` views author the whole form tree as light-DOM children; `se-form-renderer` and `se-form-instance` become behavior-only context hosts and no longer derive the tree from `render()`. Every step's fields are authored once inside `se-form-step`, which toggles its own `hidden` attribute from step state, so SSR emits the complete form and step switching is pure DOM.

The separate `viewContext` provider is removed. Published package chunks are marked side-effectful so bundlers keep custom-element registrations.

The docs app also adds a `.radiant.mdx` MDX flavor (EcoPages JSX pipeline) alongside plain `.mdx` so integration-specific content can live in `content/docs`.
