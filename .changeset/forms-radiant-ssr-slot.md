---
'@schema-engine/forms-radiant': patch
---

Keep FormEngine, adapters, and callbacks as `@state` so SSR does not stringify them onto the host tag. Split `FormRenderer` into a JSX view and `.script` host so Storybook can resolve `ssr-hydrate` and `ssr-static` the same way radiant-ui does.
