# Migrate fluent form building to `defineForm`

This is a mechanical migration. `FormComposer` stays. `FormConfigBuilder` / `createFormDefinition()` goes away.

Do not invent a new authoring API. Do not keep both APIs as equals. The engine already treats a form as configuration data; `defineForm` is that data, typed and validated.

## Why

- Forms are configuration objects. An object literal is the complete form. Fluent `addStep()` hides “current step” state.
- `defineForm` and `validateForm` share one pipeline: envelope parse, Standard Schema dispatch by `$type`, recipe-kind checks, then keep parsed output (defaults and transforms).
- The fluent builder duplicated existence checks, mutated nested arrays, and could skip whole-form invariants. It is now a thin snapshotting adapter. That adapter is deprecated. Do not grow it.

## What stays

- `FormComposer` for **registration**: `addElement`, `addRecipe`, `addAction`, then `.build()` → `FormEngine`.
- `engine.defineForm(config)` for **TypeScript authoring** of one form.
- `engine.validateForm(input: unknown)` for **external JSON**.
- Recipes, elements, and actions as Standard Schema registrations. Zod is one implementation. Valibot, Effect Schema, and hand-written `~standard` objects are also valid. Do not add Zod-only validation paths.

## What goes

- `engine.createFormDefinition()`
- `FormConfigBuilder` (`setId`, `addStep`, `addElement`, `setView`, `build`)
- Story helpers that return a builder (`createForm()`, `createStoryForm()`, anything ending in `.createFormDefinition()`)

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
- Do not call `defineForm` and then mutate the returned object’s `steps` / `elements` / `view`. Treat it as a snapshot.

## Inventory (replace these)

Update this list if `rg createFormDefinition\\|FormConfigBuilder\\|\\.addStep\\(` finds more.

| Location                                                                       | What to do                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `packages/forms/src/engine/form-engine.ts` `createFormDefinition`              | Delete after call sites are gone                                                |
| `packages/forms/src/builder/form-config-builder.ts`                            | Delete the class                                                                |
| `packages/forms/src/builder/types.ts` (`PartialFormConfig`, `BuilderFormStep`) | Delete with the builder                                                         |
| `packages/forms/src/builder/index.ts`                                          | Stop exporting the builder                                                      |
| `packages/forms/README.md`                                                     | Already prefers `defineForm`; remove adapter mention                            |
| `packages/forms-react/src/stories/shared/form-builder.ui.ts`                   | Return `{ engine, defineForm }` or just the engine; stories pass object configs |
| `packages/forms-radiant/src/stories/shared/form-builder.ts`                    | Same                                                                            |
| `packages/forms-react/src/stories/actions/action-triggers.demo.tsx`            | Replace fluent chain with `engine.defineForm({...})`                            |
| `packages/forms-react/src/stories/elements/actions/submit-button.stories.tsx`  | Same                                                                            |
| `packages/forms/test/lib/define-form-contract.test.ts` fluent snapshot test    | Keep one test until the builder is deleted, then delete the test                |

Story files that call `createForm().setId().addStep().addElement().build()` are the bulk of the work. Search:

```
createFormDefinition
.addStep(
.setView(
.setId(
```

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
- `addElement(type, config)` → push `{ $type: type, ...config }` onto the **current** step’s `elements` (in the object, there is no current step; nest explicitly)
- `addStepAction` / `addFormAction` → `steps[n].actions` / top-level `actions` with `$type`
- Final `.build()` → the `defineForm` call itself

If a helper currently returns a builder so stories can keep chaining, change it to return the `FormEngine`. Stories should own the config object so the whole form is visible.

## Types

- `defineForm` is generic over the engine’s registered elements, recipes, and actions. Unregistered `$type` should fail typecheck. If a test needs invalid JSON, use `validateForm`.
- Do not type registrations as Zod-only. `schema` is Standard Schema (`~standard.validate`). Zod, Valibot, Effect Schema, and custom objects all go through `addElement` / `addRecipe`.
- `defineFormRecipe` is a convenience for Zod recipe **specs** in this package. Framework recipes that already have a Standard Schema can `addRecipe` directly.

## Tests to keep green

- `packages/forms/test/lib/define-form-contract.test.ts` — defaults/transforms kept, mixed Standard Schema authoring schema, recipe-kind mismatch
- `packages/forms/test/lib/standard-schema-engine.test.ts` — hand-written `~standard`
- `packages/forms/test/lib/standard-schema-libraries.test.ts` — Valibot and Effect Schema
- `packages/forms/test/types/define-form.test-d.ts` — unregistered `$type` rejected
- Forms package `test:all` and `check-types`
- After story rewrites: forms-react / forms-radiant unit tests and Storybook render of a card + a wizard

## Order of work

1. Rewrite stories and demos to `defineForm` objects. Leave the deprecated builder in place so the repo still typechecks.
2. Delete fluent tests that only exist to protect the builder, except any still needed until step 3.
3. Remove `createFormDefinition`, `FormConfigBuilder`, and builder-only types. Remove exports.
4. Grep again for `createFormDefinition`, `FormConfigBuilder`, `addStep(`, `setView(`.

## Out of scope

- Do not change how `FormComposer` registers capabilities.
- Do not put recipe lookup or validation inside React/Radiant renderers; they consume `FormConfig` + `FormEngine`.
- Do not add a second fluent API “on top of” `defineForm`.
- Do not assume Zod when generating or validating registration schemas at runtime. JSON Schema export may still be Zod-backed for registrations that _are_ Zod; native Standard Schema registrations use `$type` envelopes.
