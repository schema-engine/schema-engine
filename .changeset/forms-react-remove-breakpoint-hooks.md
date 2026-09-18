---
'@schema-engine/forms-react': minor
---

Responsive grid layout moved to pure CSS generated from the engine's grid
theme; the renderer emits the stylesheet and the form's CSS variables inline
during render (React 19 style hoisting dedupes by theme key). Removed the
unused breakpoint hooks and the grid helpers from `@schema-engine/forms-react/hooks`
(`useBreakpoint`, `useFormGridStyles`, `useFieldGridStyles`,
`BreakpointOverrideProvider`); `useControlledFormElement().containerStyles`
now carries CSS custom properties consumed by the generated stylesheet.
