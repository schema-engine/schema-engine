---
'@schema-engine/forms-radiant': minor
---

Responsive grid layout becomes pure CSS generated from the engine's grid
theme. The renderer resolves breakpoints statically during render and emits
the theme stylesheet plus the form's CSS variables inline, so SSR markup is
already responsive (no resize listeners, no hydration requirement for
layout). `getFormGridStyles`/`getFieldGridStyles` are replaced by
`getFormGridVariables`/`getFieldGridVariables` (CSS custom properties).
Field wrappers gain the `se-form-field` class that consumes those variables.
