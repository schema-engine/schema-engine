# @schema-engine/forms-react

React rendering for `@schema-engine/forms`. Applications supply element registrations and view recipes; an adapter supplies form state and field operations.

## Logging

Runtime diagnostics go through `@ecopages/logger` with the `[schema-engine/forms-react]` package tag. Debug output is disabled by default; warnings and errors keep their severity and diagnostic details.

## Install

```sh
pnpm add @schema-engine/forms @schema-engine/forms-react react react-dom zod
```

For the React Hook Form adapter, also install its optional peer:

```sh
pnpm add react-hook-form
```

Install the [Schema Engine registry](../../registry) elements and recipes for your UI library. The imports below refer to the generated registration barrels in your application.

## Render a form

```tsx
import { createFormEngine } from '@schema-engine/forms';
import { FormEngineProvider, FormRenderer } from '@schema-engine/forms-react';
import { rhfAdapter } from '@schema-engine/forms-react/adapters/react-hook-form';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes';

const engine = createFormEngine({
	elements: schemaFormRegistrations,
	recipes: schemaFormRecipeRegistrations,
});

const config = engine.defineForm({
	id: 'contact',
	steps: [
		{
			id: 'details',
			elements: [
				{ $type: 'input', id: 'email', name: 'email', label: 'Email', rules: [{ type: 'email' }] },
				{ $type: 'submit', id: 'send', label: 'Send' },
			],
		},
	],
});

export function ContactForm() {
	return (
		<FormEngineProvider engine={engine} adapter={rhfAdapter}>
			<FormRenderer config={config} onSubmit={(values) => console.log(values)} />
		</FormEngineProvider>
	);
}
```

`createFormEngine` comes from `@schema-engine/forms`. Register recipes explicitly to select them through `view.$type`.

## Public entry points

| Import                                                | Purpose                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `@schema-engine/forms-react`                          | Public components, including `FormEngineProvider`, `FormProvider`, and `FormRenderer` |
| `@schema-engine/forms-react/hooks`                    | Engine, field, constraint, submission, and view hooks                                 |
| `@schema-engine/forms-react/adapters`                 | Adapter contracts and adapter-neutral form hooks                                      |
| `@schema-engine/forms-react/adapters/react-hook-form` | `rhfAdapter`; requires `react-hook-form`                                              |
| `@schema-engine/forms-react/contexts`                 | View context provider and context types                                               |
| `@schema-engine/forms-react/primitives`               | `FormElement`, `FormElements`, and React recipe contracts                             |
| `@schema-engine/forms-react/components/form-debugger` | `FormDebugger`                                                                        |

Use `useFormContext`, `useFormField`, `useWatchField`, `useWatchForm`, and `useFieldArray` from `/adapters` inside the active form. `useFieldArray` provides `fields`, `append`, `prepend`, `insert`, `swap`, `move`, `update`, `replace`, and `remove`; it keeps falsy scalar rows such as `tags: ['', '']`, which React Hook Form's own `useFieldArray` drops.

Use `useFormEngine`, `useFormInstanceActions`, `useControlledFormElement`, `useFieldHost`, `useConstraintLogic`, and `useSubmissionState` from `/hooks`. View hooks (`useViewContext`, `useOptionalViewContext`, `useActiveStep`, `useFormNavigation`, and `useViewConfig`) also come from `/hooks`.

## Consumer-owned fields and styling

`useControlledFormElement(config)` binds a field to the selected adapter and returns its value, error, handlers, control attributes, and field chrome attributes. Spread `fieldProps` onto the control, `labelProps` onto its label, and `errorProps` onto its error message when present. These attributes describe semantics and state; applications choose their styling.

The runtime exposes `se-*` class hooks and grid variables. Consumers do not need to scan the package's built files with Tailwind; applications own their styles, and registry components can bring their own UI library and styling dependencies. Use `useFieldHost` for the grid host of custom elements.

## Engine-scoped config types

Element, recipe, and action config types come from the registrations passed to
each engine. `engine.defineForm` infers the engine's authoring inputs and
normalized outputs, including schema defaults and transforms. The React provider
and renderer preserve those engine maps through their props; registrations no
longer augment a global `FormEngine` namespace.

## Migration

- Import `createFormEngine` from `@schema-engine/forms`.
- Import `rhfAdapter` only from `/adapters/react-hook-form`.
- Move runtime and view hook imports to `/hooks`, and adapter hooks to `/adapters`.
- Import `FormElement` and `FormElements` from `/primitives`.
- Replace `useFormInstance` with `useFormContext` from `/adapters`.
- Replace `useGDPRConsent` and `useGTMTracker` with `GDPRConsent` and `GTMTracker` from `@schema-engine/forms/browser`. `GDPRConsent` is a shared `GDPRConsentTool` backed by `localStorage` (`createGDPRConsent` builds one over other storage) and `GTMTracker` exposes static methods. Neither is a hook, so React state subscriptions belong to the application.

See [Getting started](../../apps/docs/src/content/docs/forms-react/getting-started.mdx), [Hooks](../../apps/docs/src/content/docs/forms-react/hooks.mdx), and [Advanced usage](../../apps/docs/src/content/docs/forms-react/advanced.mdx).

Registry source type checks run through the registry workspace's `check-types`
task in Turbo. Renderer actions import the dispatcher from
`@schema-engine/forms/actions`.

## Validation, navigation and action contexts

The React Hook Form adapter delegates validation to `validateFormValues`, step
state to `createStepMachine`, navigation (the in-flight guard and step triggers) to
`createStepNavigator`, and submission triggers to `runSubmissionLifecycle`
from `@schema-engine/forms`. Every trigger dispatches the form's actions and then the
current step's (`collectStepActions`). Unmounting the provider, which a replaced config
causes, cancels the navigation in flight, so it dispatches no step trigger afterwards. Wizard Next validates nested fieldsets and live
array rows; errors keep the nested value shape so field revalidation clears them.
A `require` constraint supplies both the control's required state and validation.

`executeAction(action)` dispatches only that action. Submission callbacks run
after the engine action lifecycle succeeds, and React Hook Form performs the
submission validation once. Step action metadata includes elapsed form time.
Action handlers receive a framework-neutral `context.form` with `reset`,
`setValue`, `getValue`, and `validate`; `validate()` resolves to the form validity.

A changed `require` condition revalidates a touched or submitted dependent field.
Submission errors name the failing action by its configured `id`.

Successful `form_submit` actions call `onAction(action, data)` before the submission
callback. A rejected action callback aborts the remaining submit actions and runs
the error and completion triggers.

## Renderer conformance

Both renderer browser projects run the scenarios in
[`test-utils/renderer-conformance.ts`](../../test-utils/renderer-conformance.ts)
through their own `FormRenderer`. They cover array sibling constraints, empty
scalar array rows, nested wizard validation, required constraints, nested error
clearing, Valibot action registration, submission aborts, and change and action
callbacks. The action context's `submitCount` is the one difference they leave
open: React counts every submit attempt, Radiant reports at most one. Run this suite
with `pnpm exec vitest run --project browser test/conformance` from this package.
