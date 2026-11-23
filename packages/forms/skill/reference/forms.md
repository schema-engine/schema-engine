# @schema-engine/forms

The engine, the config, validation timing, constraints, the container and the runtime. The terms are defined in `SKILL.md`.

## Engine

`createFormEngine` takes `elements`, `recipes`, `actions`, `validations` (extra rules), `layout`, `formatIssue`, `fetch` and `csrf`. It builds read-only registries (a later `$type` replaces an earlier one) and returns an immutable engine: create it once and reuse it. `engine.extend({ ... })` adds registrations and inherits the layout theme. The package ships no field widgets; an element is registered with `defineInput({ $type, schema, metadata, value, render })` (see `widgets.md`), and renderer packages bring the widgets.

```ts title="forms/engine.ts"
import * as z from 'zod/mini';
import { createFormEngine, defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas';

export const textRegistration = defineInput({
	$type: 'text',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('text') }),
	metadata: { name: 'Text', category: 'input' },
	value: () => z.string(),
	render: () => null,
});

export const engine = createFormEngine({ elements: [textRegistration] });
```

## Config

Authors supply schema input, so defaults stay optional; renderers receive schema output. `defineForm` and `validateForm` run one pipeline and throw a `FormValidationError` on an invalid form; `engine.safeValidateForm(json)` returns `{ success, data | issues }` with the config `path` of each issue. A step needs an `id` and a `title`.

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
					rules: [{ type: 'required', id: 'name-required', message: 'Name is required' }],
				},
				{
					$type: 'text',
					name: 'email',
					rules: [{ type: 'required' }, { type: 'email', message: 'Not an email' }],
				},
				{
					$type: 'text',
					name: 'nickname',
					rules: [{ type: 'minLength', value: 3, severity: 'warning', id: 'nickname-short' }],
				},
				{
					$type: 'text',
					name: 'company',
					constraints: [{ field: 'email', operator: 'contains', value: '@example.com', action: 'hide' }],
				},
			],
		},
	],
});
```

Form-level keys: `view` (a registered recipe, optional for a one-step form), `validationMode`, `reValidateMode`, `navigation` (`linear` or `free`), `payload`, `actions`, `grid` and `appearance`. A multi-step form with no `view` gets the engine's default wizard recipe.

## Validation timing

`validationMode` says when a field validates before a check of it has failed: `onSubmit` (default), `onChange`, `onBlur`, `onTouched` (the first blur, then every change) or `all`. `reValidateMode` (`onChange` default, `onBlur`, `onSubmit`) says when it validates once a check of it has failed. Writing the rules is in `validation-and-issues.md`.

## Constraints

A constraint is `{ field, operator, value, action }` on an element, where `field` names a sibling (resolved from where the element is rendered, so inside `contacts.0.email` it means `contacts.0.<field>`).

- `operator`: `equals`, `not_equals`, `contains`, `not_contains`, `greater_than`, `less_than`, `is_empty`, `is_not_empty`.
- `action`: `show`, `hide`, `enable`, `disable`, `require`.

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

## Runtime

`createFormRuntime({ engine, config, host, onSubmit, ... })` wraps a container with the submission, the wizard and the actions. `host.focus(paths)` is the only required host member; a renderer adds `sync` and `submitNatively` when it needs them.

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

Every command resolves one string: `moved`, `submitted`, `failed`, `invalid`, `overtaken`, `refused`, `busy` or `cancelled`. One lock covers navigation and submission, so a command made while another runs is `busy`, and a reset or `unmount` revokes the one in flight (`cancelled`); a submission whose values were already captured is committed and still completes. `runtime.getSnapshot()` is `{ submission, current, navigating, steps }`, each step with `skipped`, `visited`, `complete` and `invalid`; `runtime.container` is the state. Submitting is in `submission.md`.

## Testing a container

A container of your own, or a store that must behave like this one, proves it with the conformance suite. It registers its cases with vitest, an optional peer dependency, so import this entry only from a test file.

```ts title="forms/container-conformance.suite.ts"
import { createFormStateContainer } from '@schema-engine/forms/state-container';
import { formStateContainerConformance } from '@schema-engine/forms/testing';

formStateContainerConformance(createFormStateContainer);
```

Save your copy as `container-conformance.test.ts`; the `.suite` name only keeps this mirrored example out of this repository's own test runs.
