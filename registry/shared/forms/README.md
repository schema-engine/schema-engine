# Base UI Form Elements

Consumer-owned Schema Engine form fields for a [shadcn Base UI](https://ui.shadcn.com) app.

Install from this GitHub registry:

```bash
pnpm dlx shadcn@latest add andeeplus/schema-engine/schema-form
```

Or install one field:

```bash
pnpm dlx shadcn@latest add andeeplus/schema-engine/schema-engine-form-input
```

Files land under `@components/schema-engine/forms`. Schema Engine primitives (field chrome, phone, dropzone, chips combobox) land under `@ui/schema-engine/components`. Official shadcn primitives (`button`, `input`, `select`, …) stay on the shadcn registry.

Register everything with the generated barrel:

```typescript
import { createReactFormComposer } from '@schema-engine/forms-react';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';

const engine = createReactFormComposer().addElements(schemaFormRegistrations).build();
```

`FormSelect` is single-select. Use `FormCombobox` with `multiple` for chips-based multi-selection.

## Source

- Form elements: `registry/shared/forms` (a base may override one in `registry/<base>/overlays/forms`)
- Primitives: `registry/shared/primitives` (a base may override one in `registry/<base>/primitives`)
- Catalog: root `registry.json` (generated from `scripts/generate-schema-engine-registry.ts`)
