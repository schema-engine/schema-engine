---
'@schema-engine/forms-radiant': minor
---

Each export has one import path: `@schema-engine/forms-radiant` no longer re-exports `defineRecipeSpec` and `DEFAULT_WIZARD_RECIPE`.

| Before                                                                 | After                                                             |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `import { defineRecipeSpec } from '@schema-engine/forms-radiant'`      | `import { defineRecipeSpec } from '@schema-engine/forms/recipes'` |
| `import { DEFAULT_WIZARD_RECIPE } from '@schema-engine/forms-radiant'` | `import { DEFAULT_WIZARD_RECIPE } from '@schema-engine/forms'`    |

`defineRecipe` stays on `@schema-engine/forms-radiant`.

```ts
// before
import { defineRecipe, defineRecipeSpec, DEFAULT_WIZARD_RECIPE } from '@schema-engine/forms-radiant';
// after
import { defineRecipe } from '@schema-engine/forms-radiant';
import { defineRecipeSpec } from '@schema-engine/forms/recipes';
import { DEFAULT_WIZARD_RECIPE } from '@schema-engine/forms';
```
