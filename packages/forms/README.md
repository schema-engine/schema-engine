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
use a registered wizard recipe when one is available. `engine.validateForm`
performs the same strict schema, recipe-kind, and slot validation used by the
builder.

## Runtime and tooling

`FormEngine` exposes registered elements and recipes, action registrations,
form validation, and JSON Schema/authoring catalog generation:

```ts
engine.getRecipe('card');
engine.getFormConfigStandardSchema();
engine.describeViewCatalog();
engine.getAuthoringInstructions();
```

The package is framework-agnostic. React and Radiant packages provide the
adapter payloads and built-in view recipes.
