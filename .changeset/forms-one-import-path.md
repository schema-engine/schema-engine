---
'@schema-engine/forms': minor
---

Each export has one import path: `@schema-engine/forms` and `@schema-engine/forms/recipes` no longer re-export what another package declares. Import `formatIssuePath` from `@schema-engine/registry`, and the three recipe types from `@schema-engine/layout`.

| Before                                                                   | After                                                             |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `import { formatIssuePath } from '@schema-engine/forms'`                 | `import { formatIssuePath } from '@schema-engine/registry'`       |
| `import type { RecipeMetadata } from '@schema-engine/forms/recipes'`     | `import type { RecipeMetadata } from '@schema-engine/layout'`     |
| `import type { RecipeSlotDefaults } from '@schema-engine/forms/recipes'` | `import type { RecipeSlotDefaults } from '@schema-engine/layout'` |
| `import type { RecipeViewSchema } from '@schema-engine/forms/recipes'`   | `import type { RecipeViewSchema } from '@schema-engine/layout'`   |

`defineRecipeSpec` stays on `@schema-engine/forms/recipes` and `DEFAULT_WIZARD_RECIPE` on `@schema-engine/forms`: they are what `@schema-engine/forms-radiant` re-exported, and it no longer does. `@schema-engine/layout` and `@schema-engine/registry` are dependencies of `@schema-engine/forms`, so a project that imports them directly lists them in its own `package.json`.
