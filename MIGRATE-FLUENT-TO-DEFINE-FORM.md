# Migrate fluent form building to `defineForm`

**Status: completed.** The fluent `FormConfigBuilder` and `engine.createFormDefinition()` APIs were removed. This document remains as a reference for mechanical rewrites of any external call sites.

Forms are configuration objects. An object literal is the complete form. `defineForm` and `validateForm` share one pipeline: envelope parse, Standard Schema dispatch by `$type`, recipe-kind checks, then keep parsed output (defaults and transforms).

## What stays

- `FormComposer` for **registration**: `addElement`, `addRecipe`, `addAction`, then `.build()` → `FormEngine`.
- `engine.defineForm(config)` for **TypeScript authoring** of one form.
- `engine.validateForm(input: unknown)` for **external JSON**.
- Recipes, elements, and actions as Standard Schema registrations. Zod is one implementation. Valibot, Effect Schema, and hand-written `~standard` objects are also valid.

## Target shape

```ts
const contactForm = engine.defineForm({
	id: 'contact',
	view: { $type: 'card' },
	steps: [
		{
			id: 'main',
			title: 'Contact details',
			elements: [{ $type: 'input', id: 'email', name: 'email' }],
		},
	],
});
```

Rules:

- `$type` values must be registrations on **that** engine.
- Invalid JSON / untyped input uses `validateForm`, not `defineForm`.
- Do not call `defineForm` and then mutate the returned object's `steps` / `elements` / `view`. Treat it as a snapshot.

## Mechanical rewrite

Fluent:

```ts
engine
	.createFormDefinition()
	.setId('contact')
	.setTitle('Contact')
	.setView('card', { header: { title: 'Hi' } })
	.addStep({ id: 'main', title: 'Details' })
	.addElement('input', { id: 'email', name: 'email' })
	.addStep({ id: 'two', title: 'More' })
	.addElement('textarea', { id: 'bio', name: 'bio' })
	.build();
```

Becomes:

```ts
engine.defineForm({
	id: 'contact',
	title: 'Contact',
	view: { $type: 'card', header: { title: 'Hi' } },
	steps: [
		{
			id: 'main',
			title: 'Details',
			elements: [{ $type: 'input', id: 'email', name: 'email' }],
		},
		{
			id: 'two',
			title: 'More',
			elements: [{ $type: 'textarea', id: 'bio', name: 'bio' }],
		},
	],
});
```

Mapping:

- `setId(id)` → `id`
- `setTitle` / `setDescription` / `setValidationMode` / `setReValidateMode` / `setGrid` / `setClassName` / `setStyle` → same keys on the object
- `setView(type, config)` → `view: { $type: type, ...config }`
- Each `addStep` starts a new `{ id, title, elements: [] }` in `steps`
- `addElement(type, config)` → push `{ $type: type, ...config }` onto that step's `elements`
- `addStepAction` / `addFormAction` → `steps[n].actions` / top-level `actions` with `$type`
- Final `.build()` → the `defineForm` call itself

## Storybook helpers

Story packages expose `defineStoryForm(config)` as shorthand for `getEngine().defineForm(config)`. Custom engines (for example, extended action plugins) should call `customEngine.defineForm(config)` directly.

## Types

- `defineForm` is generic over the engine's registered elements, recipes, and actions. Unregistered `$type` should fail typecheck. If a test needs invalid JSON, use `validateForm`.
- Do not type registrations as Zod-only. `schema` is Standard Schema (`~standard.validate`).

## Verification

After migrating call sites:

```
rg 'createFormDefinition|FormConfigBuilder|\\.addStep\\('
pnpm --filter @schema-engine/forms test:all
pnpm --filter @schema-engine/forms-react test:all
```
