# @schema-engine/forms-radiant

Radiant/JSX adapter for the Schema Engine form system.

## Why the recipe components ship in this package

Unlike `@schema-engine/forms-react` — where the default view recipes live in the shadcn registry and consumers register them explicitly with `addRecipes()` — Radiant has no registry ecosystem to lean on. The shells and step blocks are therefore part of this package and `createRadiantFormComposer()` binds the canonical recipes automatically, so the package stays plug-and-play. The recipe specs themselves remain canonical in `@schema-engine/forms/recipes`.

## Install

```bash
pnpm add @schema-engine/forms-radiant @schema-engine/forms @ecopages/radiant-ui @ecopages/radiant @ecopages/jsx @ecopages/signals zod
```

Load Tailwind preflight (via Radiant core), theme, and component styles:

```ts
import '@ecopages/radiant-ui/radiant-ui-core.css';
import '@ecopages/radiant-ui/themes/default';
import '@ecopages/radiant-ui/styles.css';
```

`@schema-engine/forms-radiant` already imports `radiant-ui-core.css`. Apps that load component CSS without the package root still need the core (or their own Tailwind preflight) so headings, lists, and form controls are not left on user-agent margins.

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
