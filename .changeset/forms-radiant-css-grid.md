---
'@schema-engine/forms-radiant': minor
---

Responsive grid layout becomes pure CSS generated from the engine's grid
theme. The renderer emits the theme stylesheet plus the form's CSS variables
inline, so SSR markup is already responsive (no resize listeners, no hydration
requirement for layout). `getFormGridStyles`/`getFieldGridStyles` are replaced
by `mergeFieldGridHost`, which resolves the owning engine's theme id and the
field's placement variables in one place. Field wrappers gain the
`se-form-field` class that consumes those variables; a caller-supplied
`class` is now merged with it instead of replacing it.
