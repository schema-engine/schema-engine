---
'@schema-engine/forms': minor
'@schema-engine/forms-react': minor
'@schema-engine/forms-radiant': patch
---

Let a single element set its own vertical rhythm, and let non-input elements sit on the grid at all.

`grid.marginBlockStart` and `grid.marginBlockEnd` accept the same gap tokens as the form's spacing, and are responsive per breakpoint like the rest of `grid`:

```ts
{ $type: 'submission-alert', id: 'status', name: 'status',
  grid: { marginBlockEnd: 'wide', responsive: { lg: { marginBlockEnd: 'loose' } } } }
```

They ride the shared field property table rather than a parallel mechanism, so they inherit the breakpoint cascade and the inheritance resets that stop a nested field picking up its parent's values — and one system keeps owning the block axis instead of two competing over it.

This works for any element that renders a `.se-form-field` host carrying the owning engine's theme id. Inputs already got that from the field primitive; content and decoration elements did not, so they were silently ignoring their whole `grid` config, placement included. `@schema-engine/forms-react/hooks` now exports `useFieldHost(grid, style)` for elements that build their own container, matching `mergeFieldGridHost` in `@schema-engine/forms-radiant`:

```tsx
<div {...useFieldHost(config.grid, config.style)}>…</div>
```

The built-in submission alert uses it in both renderers, so it now honours `grid` placement and spacing like any field.
