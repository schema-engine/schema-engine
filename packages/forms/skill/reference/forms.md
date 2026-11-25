# @schema-engine/forms

The engine, the config, validation timing, constraints, the container and, for renderer authors, the runtime. The terms are defined in the router (`SKILL.md`).

## Engine

`createFormEngine` takes `elements`, `recipes`, `actions`, `validations` (extra rules), `layout`, `formatIssue`, `fetch` and `csrf`. It builds read-only registries (a later `$type` replaces an earlier one) and returns an immutable engine: create it once and reuse it. `engine.extend({ ... })` adds registrations and inherits the layout theme. An app gives the engine and a config to a renderer: `FormRenderer` in `forms-react.md` or `forms-radiant.md`. The package ships no field widgets; an element is registered with `defineInput({ $type, schema, metadata, value, render })` (see Registrations below), and renderer packages bring the widgets.

```ts title="forms/engine.ts"
import * as z from 'zod/mini';
import { createFormEngine, defineInput, BaseFieldSchema } from '@schema-engine/forms';

export const textRegistration = defineInput({
	$type: 'text',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('text') }),
	metadata: { name: 'Text', category: 'input' },
	value: () => z.string(),
	render: () => null,
});

export const engine = createFormEngine({ elements: [textRegistration] });
```

## Registrations

You register with `createFormEngine({ elements, recipes, actions, validations })`: the engine builds one read-only registry of each from the lists, on `@schema-engine/registry`.

```ts title="forms/registry.ts"
import { createFormEngine } from '@schema-engine/forms';
import { postalCode } from './custom-rule';
import { textRegistration } from './engine';

export const appEngine = createFormEngine({ elements: [textRegistration], validations: [postalCode] });

export const elementTypes = appEngine.getAllElements().map(({ $type }) => $type);

export const ruleTypes = appEngine.getValidationRegistry().keys();
```

Registrations are stored by `$type`, and a later one replaces an earlier one with no warning, so a list ending in your own replaces a built-in. A schema that is not a Standard Schema (no `~standard.validate`) throws at build, naming the kind and the `$type`. The registries are read-only and frozen, and the objects you passed are left untouched, so there is no `register` or `clear` after the build. A registry of your own, outside a form engine, is in `registry.md`.

Every registration is `{ $type, schema, metadata }` (an element also has a `kind`, `'input'` or `'static'`, which `defineInput` and `defineStatic` set and a registration written by hand must state): `$type` is the stable key, `schema` is any Standard Schema (Zod, Zod Mini, Valibot, Effect Schema or a hand-written one) that describes the config, and `metadata` has a `name` and optionally a `description`, `icon`, `tags` and `version`. A renderable one adds `render`; an action adds `execute`; a validation rule adds `category` and `handler`.

The engine builds four registries from `createFormEngine`: `elements` (`defineInput` for a field, `defineStatic` for display-only content), `recipes`, `actions` and `validations`. `elements` and `recipes` are for the renderer, `actions` for the runtime and `validations` for the container. Authors supply the schema's input and renderers receive its output, so register elements with `defineInput` (which also takes the `value` the control writes) and `defineStatic`, which keep the two apart.

The engine lists what it holds with `getAllElements()`, `getAllRecipes()` and `getAllActions()`, looks one up with `getElement($type)`, `getRecipe($type)` and `getAction($type)`, and exposes its rules as `getValidationRegistry()`, itself a read-only registry. `engine.generateFormConfigSchema()` exports a JSON Schema of the form config for editors and other tools. The engine never changes after it is built: `engine.extend({ ... })` returns a new one.

### Registering a widget

A widget is a registration, `defineInput({ $type, schema, metadata, value, render })`, and the schema is the widget's config: `z.extend(BaseFieldSchema, { $type: z.literal('...'), ...yours })`. `defineInput` keeps the schema's input and output apart, so authors write the input and `render` receives the output with defaults applied. `value` declares what the control writes, as a function of the configured element that returns a Standard Schema (a rating's `max` is its bound; a select's options are an enum): `defineInput` requires it, the engine checks every submission against it, and the type of `onSubmit` comes from it. The control writes exactly what it declares (a number option is a number, not its text), and a control that writes something else fails the submission with a `valueMismatch` issue at its path. A container widget declares `elements: elementChildrenSchema`, no `value` (its value is its children's), and renders its children with `FormElements`, which composes the paths at render time. A display-only element uses `defineStatic` and declares none. Writing the `render` function is in `forms-react-widgets.md` and `forms-radiant-widgets.md`.

## Config

Authors supply schema input, so defaults stay optional; renderers receive schema output. `defineForm` and `validateForm` run one pipeline and throw a `FormValidationError` on an invalid form; `engine.safeValidateForm(json)` returns `{ success, data | issues }` with the config `path` of each issue; `formatIssuePath(path)` (from `@schema-engine/registry`, re-exported by forms) writes a path as `steps[0].elements[2].name`. A step needs an `id` and a `title`.

```ts title="forms/contact-form.ts"
import { engine } from './engine';

export const contactForm = engine.defineForm({
	id: 'contact',
	validationMode: 'onBlur',
	steps: [
		{
			id: 'details',
			title: 'Details',
			elements: [
				{
					$type: 'text',
					name: 'name',
					rules: [{ $type: 'required', id: 'name-required', message: 'Name is required' }],
				},
				{
					$type: 'text',
					name: 'email',
					rules: [{ $type: 'required' }, { $type: 'email', message: 'Not an email' }],
				},
				{
					$type: 'text',
					name: 'nickname',
					rules: [{ $type: 'minLength', value: 3, severity: 'warning', id: 'nickname-short' }],
				},
				{
					$type: 'text',
					name: 'company',
					constraints: [{ field: 'email', operator: 'contains', value: '@example.com', $type: 'hide' }],
				},
			],
		},
	],
});
```

Form-level keys: `view` (a registered recipe, optional for a one-step form), `validationMode`, `reValidateMode`, `navigation` (`linear` or `free`), `payload`, `actions`, `grid` and `appearance`. A multi-step form with no `view` gets the engine's default wizard recipe.

## Validation timing

`validationMode` says when a field validates before a check of it has failed: `onSubmit` (default), `onChange`, `onBlur`, `onTouched` (the first blur, then every change) or `all`. `reValidateMode` (`onChange` default, `onBlur`, `onSubmit`) says when it validates once a check of it has failed. Writing the rules is in `forms-validation.md`.

## Constraints

A constraint is `{ field, operator, value, $type }` on an element, where `field` names a sibling (resolved from where the element is rendered, so inside `contacts.0.email` it means `contacts.0.<field>`).

- `operator`: `equals`, `not_equals`, `contains`, `not_contains`, `greater_than`, `less_than`, `is_empty`, `is_not_empty`.
- `$type`: `show`, `hide`, `enable`, `disable`, `require`.

A hidden or disabled field, and every field of a skipped step, takes no part: it is never validated and is left out of the submitted values. A step takes `show` and `hide` constraints on fields of earlier steps. A renderer never evaluates constraints itself: it reads them from the container (`selectFieldState(snapshot, path)` gives `hidden`, `disabled` and `required`).

## Container

`createFormStateContainer({ config, registry, defaults?, snapshot? })` builds the state of a form with no framework. `config` is the normalized form and `registry` is `engine.getValidationRegistry()`. The runtime and both renderers build theirs for you; build one directly for a server check, a script or a renderer of your own.

```ts title="forms/container.ts"
import { createFormStateContainer } from '@schema-engine/forms/state-container';
import { contactForm } from './contact-form';
import { engine } from './engine';

export function createContactContainer() {
	return createFormStateContainer({ config: contactForm, registry: engine.getValidationRegistry() });
}

export async function submitContact(name: string, email: string) {
	const container = createContactContainer();
	container.setValue('name', name);
	container.setValue('email', email);

	const result = await container.submit();
	if (result.outcome === 'passed') {
		result.setServerErrors({ email: { type: 'taken' } });
	}
	return { container, result };
}
```

- `validate(paths?)` records the findings and resolves `{ outcome: 'passed' | 'invalid' | 'overtaken' }`. An empty list validates nothing and omitting it validates the form. A check outrun by an edit runs once more over the same rows; only a second outrun, a removed row or a reset is `overtaken`. It rejects with a `FormValidationFailure` when a rule could not run.
- `checkValidity()` is a boolean for the state at the call. It writes nothing and is never overtaken.
- `submit()` resolves `{ outcome: 'passed', values, setServerErrors }`, `{ outcome: 'invalid' }` or `{ outcome: 'overtaken' }`. The values are frozen, exclude fields that took no part and carry the config's `payload`.
- `reportNative(facts)` takes what a platform control says about its value; renderers call it, not application code.
- `reset(values?)` restores the defaults, or replaces them first, and clears every error, mark and fact.
- `getSnapshot()` is stable until something changes. Read it with `selectValue` and `selectFieldState` (its `error` is the one of exactly that path), which return the same object while what they read is unchanged, so they are safe for `useSyncExternalStore`.
- `toHydration(container.getServerSnapshot())` is the serializable part a server hands to a client, which passes it as `snapshot` so row ids survive.

## Runtime (for renderer authors)

An app does not create a runtime: a renderer creates one for each form it draws, and an app reaches it with a hook or a controller (`useFormRuntime`, `FormController`). `createFormRuntime({ engine, config, host, onSubmit, ... })` wraps a container with the submission, the wizard and the actions. `host.focus(paths)` is the only required host member; a renderer adds `sync` and `submitNatively` when it needs them.

```ts title="forms/runtime.ts"
import { createFormRuntime, type FormValues } from '@schema-engine/forms';
import { notifyEngine, notifyForm } from './notify-action';

export function createNotifyRuntime(onSubmit: (values: FormValues) => void) {
	const runtime = createFormRuntime({
		engine: notifyEngine,
		config: notifyForm,
		host: { focus: () => {} },
		onSubmit,
	});
	const unmount = runtime.mount();
	return { runtime, unmount };
}
```

Every command resolves one string: `moved`, `submitted`, `failed`, `invalid`, `overtaken`, `refused`, `busy` or `cancelled`. One lock covers navigation and submission, so a command made while another runs is `busy`, and a reset or `unmount` revokes the one in flight (`cancelled`); a submission whose values were already captured is committed and still completes. `runtime.getSnapshot()` is `{ submission, current, navigating, steps }`, each step with `skipped`, `visited`, `complete` and `invalid`; `runtime.container` is the state. Submitting is in `forms-submission.md`.

## Testing a container

A container of your own, or a store that must behave like this one, proves it with the conformance suite. It depends on no test runner: pass the `describe` and `test` of yours (Vitest below; Jest, Bun and `node:test` work the same), and import this entry only from a test file.

```ts title="forms/container-conformance.test.ts"
import { describe, test } from 'vitest';
import { createFormStateContainer } from '@schema-engine/forms/state-container';
import { formStateContainerConformance } from '@schema-engine/forms/testing';

formStateContainerConformance(createFormStateContainer, { describe, test });
```

Save your copy as `container-conformance.test.ts`.

## Agent tool (experimental)

`registerFormAgentTool(runtime, { name, description })` from `@schema-engine/forms/agent-tool` offers a rendered form to a browser agent as a WebMCP tool: the tool's input is the runtime's `submissionSchema`, and calling it fills the form and, with `autoSubmit: true`, submits it. It returns the function that unregisters the tool. WebMCP is an origin trial and the API may change, so nothing else in the package imports it.
