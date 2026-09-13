# @schema-engine/forms-radiant

Radiant/JSX adapter for the Schema Engine form system.

## Why the recipe components ship in this package

Unlike `@schema-engine/forms-react` — where the default view recipes live in the shadcn registry and consumers register them explicitly with `createReactFormEngine({ recipes })` — Radiant has no registry ecosystem to lean on. The shells and step blocks are therefore part of this package and `createRadiantFormEngine()` binds the canonical recipes automatically, so the package stays plug-and-play. The recipe specs themselves remain canonical in `@schema-engine/forms/recipes`.

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

`@schema-engine/forms-radiant` already imports `radiant-ui-core.css` from source. Apps that load the compiled package should import the emitted stylesheet — published JS does not execute CSS:

```ts
import '@schema-engine/forms-radiant/index.css';
```

That file includes host display rules and first-party shell/field CSS. Apps that load component CSS without the package root still need the core (or their own Tailwind preflight) so headings, lists, and form controls are not left on user-agent margins.

First-party schemas use the functional `zod/mini` API. Install the `zod` package when authoring schemas; registrations supplied by consumers may use any Standard Schema implementation, including Valibot, Effect Schema, or Zod.

## Quick start

```ts
import { createRadiantFormEngine, FormRenderer, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { radiantAdapter } from '@schema-engine/forms-radiant/adapters/radiant';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

<FormRenderer engine={engine} adapter={radiantAdapter} config={formConfig} onSubmit={handleSubmit} />;
```

`engine` and `adapter` are `@state` (JS only). `@prop({ type: Object })` would stringify them onto the host tag.

## Rendering architecture

View-owned shell, same authoring model as radiant-ui: the `FormRenderer` / `FormInstance` views author the whole form tree as light-DOM children (authored children, no `<slot />` written by hosts), and `se-form-renderer` / `se-form-instance` are behavior-only hosts that publish context. There is no derived tree at the form level.

- Every step's fields are authored once inside `se-form-step`; hosts toggle their own `hidden` attribute from the step state, so SSR emits the full form and step switching is pure DOM.
- Conditional fields with constraints are wrapped in a plain `.se-form-constraint` container with `data-se-constraint-field`. `se-form-instance` listens to the form store and toggles `hidden` reactively without requiring separate custom element wrappers or serialized JSON configs.
- Recipe chrome blocks read serializable `config` / `viewConfig` props plus the live `formInstanceContext`; where SSR cannot resolve context (authored children serialize before providers publish), they fall back to the initial step-0 state and hydrate the live values.
- Published JS must keep element registrations: `sideEffects` marks the compiled chunks so bundlers do not drop the bare script imports.

## MVP elements

- input, textarea, number, select, checkbox, switch, radio, submit-button

Fields and array components share Radiant UI's form store through
`FormController`. Use it with explicit `connect` / `disconnect` lifecycle methods
or the optional `@formController` decorator. `FormFieldElement` extends
`RuiFieldElement` and exposes scoped form access; Radiant UI retains control
registration, validation, and error presentation.

The controller provides snapshot reads, live watches with cleanup, field bindings,
and array mutations with stable row IDs. See the [controller API and migration
guide](./src/adapters/radiant/controller/README.md) for examples and the replacement
for the removed snapshot hooks.

Schemas are reused from `registry/shared/forms/*.types.ts`. Wrappers live in `src/elements/` and import `@ecopages/radiant-ui` directly.

## Development

```bash
pnpm build:lib
pnpm test:all
pnpm storybook   # port 6007
```

From monorepo root: `pnpm dev:radiant-storybook`.

Stories default to **client** render. Use the Storybook toolbar **Radiant render** control to spot-check `ssr-hydrate` and `ssr-static` on any story — same contract as radiant-ui. Play functions skip `ssr-static` (markup-only iframe, no client module).
