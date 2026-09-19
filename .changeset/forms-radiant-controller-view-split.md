---
'@schema-engine/forms-radiant': patch
---

Split the form instance behavior host into its own script file

`FormInstanceElement` moves to `components/form-instance.script.tsx`, leaving
`components/form-instance.tsx` as the JSX view. This is the radiant-ui layout
and matches `internals/form-renderer.script.tsx`, which already had it. No
export moves: the view re-exports the element, so importing it still registers
`<se-form-instance>`, and the package root is unchanged.
