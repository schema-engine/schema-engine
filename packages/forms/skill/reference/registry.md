# Registries

How the engine stores what you register. You register with `createFormEngine({ elements, recipes, actions, validations })`: the engine builds one read-only registry of each from the lists, on `@schema-engine/registry`.

```ts title="forms/registry.ts"
import { createFormEngine } from '@schema-engine/forms';
import { postalCode } from './custom-rule';
import { textRegistration } from './engine';

export const appEngine = createFormEngine({ elements: [textRegistration], validations: [postalCode] });

export const elementTypes = appEngine.getAllElements().map(({ $type }) => $type);

export const ruleTypes = appEngine.getValidationRegistry().keys();
```

Registrations are stored by `$type`, and a later one replaces an earlier one with no warning, so a list ending in your own replaces a built-in. A schema that is not a Standard Schema (no `~standard.validate`) throws at build, naming the kind and the `$type`. The registries are read-only and frozen, and the objects you passed are left untouched, so there is no `register` or `clear` after the build. A registry of your own, outside a form engine, is `createRegistry(kind, registrations)` from `@schema-engine/registry`, with the same `get`, `has`, `all`, `keys` and `size`.

## What a registration is

Every registration is `{ $type, schema, metadata }` (an element also has a `kind`, `'input'` or `'static'`, which `defineInput` and `defineStatic` set and a registration written by hand must state): `$type` is the stable key, `schema` is any Standard Schema (Zod, Zod Mini, Valibot, Effect Schema or a hand-written one) that describes the config, and `metadata` has a `name` and optionally a `description`, `icon`, `tags` and `version`. A renderable one adds `render`; an action adds `execute`; a validation rule adds `category` and `handler`.

The engine builds four registries from `createFormEngine`: `elements` (`defineInput` for a field, `defineStatic` for display-only content), `recipes`, `actions` and `validations`. `elements` and `recipes` are for the renderer, `actions` for the runtime and `validations` for the container. Authors supply the schema's input and renderers receive its output, so register elements with `defineInput` (which also takes the `value` the control writes) and `defineStatic`, which keep the two apart.

The engine lists what it holds with `getAllElements()`, `getAllRecipes()` and `getAllActions()`, looks one up with `getElement($type)`, `getRecipe($type)` and `getAction($type)`, and exposes its rules as `getValidationRegistry()`, itself a read-only registry. `engine.generateFormConfigSchema()` exports a JSON Schema of the form config for editors and other tools. The engine never changes after it is built: `engine.extend({ ... })` returns a new one.
