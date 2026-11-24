# @schema-engine/forms-react

The React renderer and its hooks. The package renders a normalized form; the field widgets are your code, written by you (`forms-react-widgets.md`) or optionally copied from the shadcn registry.

## Setup

Install `@schema-engine/forms-react`, `@schema-engine/forms`, `@schema-engine/layout`, `react`, `react-dom` and `zod`. Write your widgets with `useFormField` (`forms-react-widgets.md`) and pass them as `elements`. Build the engine once and reuse it. Optionally, a project that uses shadcn can copy ready-made widgets and recipes with `pnpm dlx shadcn@latest add schema-engine/schema-engine/schema-form schema-engine/schema-engine/schema-engine-form-recipes`: its generated `registrations` barrel is then the list to pass as `elements`, and `recipes/recipes.css` is imported once after Tailwind.

```ts title="react/engine.ts"
import { createFormEngine } from '@schema-engine/forms';
import { ratingFieldRegistration } from './rating-field';
import { textFieldRegistration } from './text-field';

export const engine = createFormEngine({ elements: [textFieldRegistration, ratingFieldRegistration] });
```

## Rendering

`FormRenderer` takes the form and renders it. A plain config is validated at that boundary; pass `engine.defineForm(...)` when you want the typed, normalized one. The engine comes from the `engine` prop or from an enclosing `FormEngineProvider`. Its other props are `defaultValues`, `onSubmit(values, helpers)`, `onChange(values)`, `onAction`, `onActionResults`, `navigate` (where a submit action's `redirectUrl` takes the page, `location.assign` by default), `formatIssue`, `className`, `style` and `children`, which render inside the form so they can use the hooks.

```tsx title="react/profile-form.tsx"
import type { FormSubmitHelpers, FormValues } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { engine } from './engine';
import { ResetButton } from './hooks';

export const profile = engine.defineForm({
	id: 'profile',
	steps: [
		{
			id: 'main',
			title: 'Profile',
			elements: [
				{
					$type: 'text',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [{ $type: 'required', message: 'Email is required' }],
				},
				{ $type: 'rating', id: 'stars', name: 'stars', label: 'Stars' },
			],
		},
	],
});

async function save(values: FormValues, { fetch }: FormSubmitHelpers) {
	await fetch('/api/profile', { method: 'POST', body: JSON.stringify(values) });
}

export function ProfileForm() {
	return (
		<FormRenderer engine={engine} config={profile} onSubmit={save}>
			<ResetButton />
		</FormRenderer>
	);
}
```

The form's runtime and container are created once per form instance, and their lifetime follows the identity of the config passed in: a new config starts a fresh form with its defaults and step state. The hooks read the container through its selectors, so a field re-renders only for its own value, error or flags, and a parent render alone calls neither `onChange` nor a `form_change` action. Import every hook from `@schema-engine/forms-react/hooks`.

## The four hooks

- `useFormField(config)` binds a widget to one field. It is uncontrolled by default; `useFormField(config, { controlled: true })` is for a component that takes only `value` and `onChange`; `useFormField(path)` is the state of a path with no value. How to choose, and what each returns, is in `forms-react-widgets.md`.
- `useFormContext()` returns the commands over the form: `getValues()`, `setValue(name, value)`, `validate(name?)` (a path or several, resolving `{ outcome }`), `reset(values?)`, `setFocus(name)`, `formatIssue(issue, { path })` and `clearSubmission()`. Its `formState` is lazy: `errors`, `isValid` (the recorded errors, validating nothing) and `submission` (`status`, `failures`, `submitCount`). A component re-renders only for the keys it reads.
- `useWatch()` reads every value, `useWatch(path)` one and `useWatch([paths])` a list, and re-renders only when what it reads changes.
- `useFieldArray(name)` returns `fields` (one `{ id }` per row, stable through reordering) and `append`, `prepend`, `insert`, `swap`, `move`, `update`, `replace` and `remove`. Rows keep their errors, touched state and ids through every operation, and an operation that adds a row focuses its first control.

```tsx title="react/hooks.tsx"
import { isSubmissionBusy } from '@schema-engine/forms';
import { useFormContext, useWatch } from '@schema-engine/forms-react/hooks';

export function EmailPreview() {
	const email = useWatch('email');
	return <output>{typeof email === 'string' ? email : ''}</output>;
}

export function ResetButton() {
	const { reset, formState } = useFormContext();
	const busy = isSubmissionBusy(formState.submission.status);
	return (
		<button type="button" onClick={() => reset()} disabled={busy}>
			Reset
		</button>
	);
}
```

For a wizard, `useFormInstanceActions()` exposes `current` (the step id), `steps`, `navigating` and `next()`, `back()` and `goTo(id)`. `useFormEngine()` reads the engine the provider supplied. Recipe blocks read the active view with `useViewContext`, `useActiveStep`, `useFormNavigation` and `useViewConfig`.

`useFormRuntime()` gives the runtime of the form the component sits in, which `registerFormAgentTool` takes (`forms.md`).
