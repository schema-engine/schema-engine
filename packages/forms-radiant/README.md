# @schema-engine/forms-radiant

Radiant/JSX adapter for the Schema Engine form system.

## Install

```bash
pnpm add @schema-engine/forms-radiant @schema-engine/forms @ecopages/radiant-ui @ecopages/radiant @ecopages/jsx @ecopages/signals zod
```

Load theme + styles:

```ts
import '@ecopages/radiant-ui/themes/default';
import '@ecopages/radiant-ui/styles.css';
```

## Quick start

```ts
import { createRadiantFormComposer, FormRenderer, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { radiantAdapter } from '@schema-engine/forms-radiant/adapters/radiant';

const engine = createRadiantFormComposer().addElements(schemaFormRegistrations).build();

<FormRenderer engine={engine} adapter={radiantAdapter} config={formConfig} onSubmit={handleSubmit} />;
```

## MVP elements

- input, textarea, number, select, checkbox, switch, radio, submit-button

Schemas are reused from `registry/shared/forms/*.types.ts`. Wrappers live in `src/elements/` and import `@ecopages/radiant-ui` directly.

## Development

```bash
pnpm build:lib
pnpm test:all
pnpm storybook   # port 6007
```

From monorepo root: `pnpm dev:radiant-storybook`
