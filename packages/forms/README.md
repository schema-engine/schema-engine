# @schema-engine/forms

Framework-agnostic form configuration, validation, actions, and view-recipe
registration for Schema Engine.

## Compose an engine

```ts
import { FormComposer } from '@schema-engine/forms';

const engine = new FormComposer()
	.addElement(textInputRegistration)
	.addRecipe(cardRecipe)
	.addAction(submitActionRegistration)
	.build();
```

`FormComposer` owns element, recipe, and action registrations. A recipe is the
single view protocol: it declares the recipe kind, shell/slot keys, validation
schema, metadata, and framework adapter payload. Forms select one recipe with
`view.$type`.

```ts
const form = engine.defineForm({
	id: 'contact',
	title: 'Contact',
	steps: [{ id: 'details', title: 'Details', elements: [] }],
	view: { $type: 'card', header: { showDescription: true } },
});
```

Single-step forms may omit `view` to render fields directly. Multi-step forms
that omit `view` use the registered `bare-controls` recipe at **render** time.
`engine.validateForm` still succeeds if that recipe is missing; the renderer
warns and shows fields without chrome. `validateForm` does apply kind and slot
checks when `view.$type` is set.

## Who owns visual chrome

| Layer                                                         | Owns                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `@schema-engine/forms/recipes`                                | Specs, `defineFormRecipe`, kinds, slot schemas                      |
| Schema Engine shadcn registry (`schema-engine-form-recipes*`) | React shells, blocks, `schemaFormRecipeRegistrations`               |
| `@schema-engine/forms-radiant`                                | Radiant shells and blocks; `createRadiantFormComposer()` binds them |

This package is framework-agnostic. It does not ship default visual recipes.

## Runtime and tooling

`FormEngine` exposes registered elements and recipes, action registrations,
form validation, and JSON Schema/authoring catalog generation:

```ts
engine.getRecipe('card');
engine.getFormConfigStandardSchema();
engine.describeViewCatalog();
engine.getAuthoringInstructions();
```
