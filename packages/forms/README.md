# @schema-engine/forms

Framework-agnostic form configuration, validation, actions, and view-recipe
registration for Schema Engine.

First-party schemas are authored with Zod Mini's functional API and imported
from `zod/mini`. Install the `zod` package when using the built-in schemas. The
registration contracts remain `StandardSchemaV1`, so custom elements, recipes,
and actions can use Valibot, Effect Schema, Zod, or another compatible
provider.

## Compose an engine

```ts
import { createFormEngine } from '@schema-engine/forms';

const engine = createFormEngine({
	elements: [textInputRegistration],
	recipes: [cardRecipe],
	actions: [submitActionRegistration],
});
```

`createFormEngine` registers elements, recipes, and actions in one declarative
call. A recipe is the single view protocol: it declares the recipe kind,
shell/slot keys, validation schema, metadata, and framework adapter payload.
Forms select one recipe with `view.$type`.

```ts
const contactForm = engine.defineForm({
	id: 'contact',
	title: 'Contact',
	view: { $type: 'card' },
	steps: [
		{
			id: 'details',
			title: 'Details',
			elements: [{ $type: 'input', id: 'email', name: 'email' }],
		},
	],
});
```

`defineForm` is the typed authoring API for that engine's registrations. `validateForm(input: unknown)` validates external JSON. Both run the same pipeline: envelope parse, Standard Schema dispatch by `$type` (including nested child elements), recipe-kind checks, and schema defaults/transforms. The normalized marker is applied only after that succeeds. `defineForm` and `validateForm` return a frozen `NormalizedFormConfig` owned by that engine. Snapshot isolation copies plain objects and arrays, so caller data of those kinds is not frozen. Other objects currently remain shared. A normalized form cannot be reused on another engine; pass the original authoring input or JSON instead. Renderers consume that normalized output. They do not re-run registration input schemas. Standalone or dynamically created fields that are not already inside a form must go through `engine.validateElement()` first. Containers render children with `FormElements` and a field scope (`namePrefix`, `instanceId`); they do not clone normalized configs to change paths.

Use `engine.extend({ ... })` to add registrations without re-spreading shared barrels. Author forms with `engine.defineForm({ ... })` object literals.

Single-step forms may omit `view` to render fields directly. Multi-step forms
that omit `view` use the registered `bare-controls` recipe at **render** time.
`engine.validateForm` still succeeds if that recipe is missing; the renderer
warns and shows fields without chrome. `validateForm` does apply kind and slot
checks when `view.$type` is set.

## Who owns visual chrome

| Layer                                                           | Owns                                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `@schema-engine/forms`                                          | Engine, validation, actions, recipe specs                                                   |
| `@schema-engine/forms-react`                                    | React renderer, RHF adapter, field-array operations, and headless `createReactFormEngine()` |
| `@schema-engine/forms-radiant`                                  | Radiant shells, blocks, and scoped form controllers; `createRadiantFormEngine()` binds them |
| Schema Engine shadcn registry (`schemaFormRegistrations`, etc.) | Default field components and view recipes for the React adapter                             |
