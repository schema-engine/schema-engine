# Base UI Form Elements

Consumer-owned Schema Engine form fields for a [shadcn Base UI](https://ui.shadcn.com) app. Resolve the renderer and hooks through `@schema-engine/forms-react` package exports; mixing source aliases with built package imports creates separate provider contexts.

Install from this GitHub registry:

```bash
pnpm dlx shadcn@latest add andeeplus/schema-engine/schema-form
```

Or install one field:

```bash
pnpm dlx shadcn@latest add andeeplus/schema-engine/schema-engine-form-input
```

Install the default visual recipes separately when a form uses a supplied `view.$type`:

```bash
pnpm dlx shadcn@latest add andeeplus/schema-engine/schema-engine-form-recipes
```

Files land under `@components/schema-engine/forms`. Schema Engine primitives (field chrome, phone, dropzone, chips combobox) land under `@ui/schema-engine/components`. Official shadcn primitives (`button`, `input`, `select`, …) stay on the shadcn registry.

Register everything with the generated barrel:

```typescript
import { createFormEngine } from '@schema-engine/forms';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations';

const engine = createFormEngine({ elements: schemaFormRegistrations, recipes: schemaFormRecipeRegistrations });
```

`FormSelect` is single-select. Use `FormCombobox` with `multiple` for chips-based multi-selection.

## Source

- Form elements: `registry/shared/forms` (a base may override one in `registry/<base>/overlays/forms`)
- Primitives: `registry/shared/primitives` (a base may override one in `registry/<base>/primitives`)
- Catalog: root `registry.json` (generated from `scripts/generate-schema-engine-registry.ts`)

Each copied field item includes its own `form-*.types.ts` Zod schema beside the widget and registration. After `shadcn add`, that schema is yours to change; bumping `@schema-engine/forms` alone does not update copied widgets. Re-add or patch the item when a wrapper must learn new configuration keys.

Field schemas are authoring contracts for the copied wrappers. Wrappers pass only supported control props to DOM primitives, so schema metadata such as `$type`, rules, and layout configuration stays in the form renderer. Forward extra control attributes (`data-testid`, `enterKeyHint`, and similar) through `htmlAttributes` on the field config rather than spreading the field object onto the control.

The registry includes `date` and `date-range` fields that Radiant does not ship; do not assume every default `$type` exists on every renderer.

The [input registrations](inputs/README.md) declare array container semantics
for the engine's shared field traversal.
