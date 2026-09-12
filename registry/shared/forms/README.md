# Base UI Form Elements

Consumer-owned Schema Engine form fields for a [shadcn Base UI](https://ui.shadcn.com) app. JSX sources declare the React runtime explicitly for mixed-runtime consumers. Resolve the renderer and hooks through `@schema-engine/forms-react` package exports; mixing source aliases with built package imports creates separate provider contexts.

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
import { createReactFormEngine } from '@schema-engine/forms-react';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations';

const engine = createReactFormEngine({ elements: schemaFormRegistrations, recipes: schemaFormRecipeRegistrations });
```

`FormSelect` is single-select. Use `FormCombobox` with `multiple` for chips-based multi-selection.

## Source

- Form elements: `registry/shared/forms` (a base may override one in `registry/<base>/overlays/forms`)
- Primitives: `registry/shared/primitives` (a base may override one in `registry/<base>/primitives`)
- Catalog: root `registry.json` (generated from `scripts/generate-schema-engine-registry.ts`)
