---
'@schema-engine/forms-radiant': minor
---

The entries follow the renderer layout shared with forms-react: `.`, `/primitives`, `/debugger` and `/debugger.css` mean the same in both, and forms-radiant adds `/registrations` and `/index.css`.

- What you build elements and recipes from is on `@schema-engine/forms-radiant/primitives`. `defineRecipe`, `FormElements`, `FormElementsProps`, `FormShellProps`, `FormShellComponent`, `FormMeta` and the `RadiantRecipeAdapterPayload`, `RadiantRecipePayload` and `RadiantRecipeSlotFactory` types move there from the package root. `formInstanceContext`, `formEngineContext`, `combineHandlers` and `mergeFieldGridHost` move there from `/contexts` and `/hooks`, which are removed. Importing `defineRecipe` no longer loads the built-in recipes.
- `FormDebugger` and `FormDebuggerElement` move from the package root to `@schema-engine/forms-radiant/debugger`, and their styles move out of `index.css` into `@schema-engine/forms-radiant/debugger.css`. An app that does not render the debugger no longer registers `se-form-debugger`, loads its badge or ships its styles.
- `FormInstance` and `RecipeRenderer` are no longer exported: render forms with `FormRenderer`.
- On a server, import `@ecopages/radiant/server/install-ssr-runtime` before any forms-radiant entry. Every entry defines custom elements, so importing one in Node without it throws `HTMLElement is not defined`. The server rendering page now says so.

```diff
- import { defineRecipe, type FormShellProps, FormDebugger } from '@schema-engine/forms-radiant';
- import { formInstanceContext } from '@schema-engine/forms-radiant/contexts';
- import { combineHandlers } from '@schema-engine/forms-radiant/hooks';
+ import { defineRecipe, type FormShellProps, formInstanceContext, combineHandlers } from '@schema-engine/forms-radiant/primitives';
+ import { FormDebugger } from '@schema-engine/forms-radiant/debugger';
```

```css
@import '@schema-engine/forms-radiant/index.css';
/* only while debugging */
@import '@schema-engine/forms-radiant/debugger.css';
```
