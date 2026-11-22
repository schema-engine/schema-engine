# @schema-engine/forms-react

React rendering for `@schema-engine/forms`. Applications supply element registrations and view recipes; the form state is the engine's own container, which the hooks read with `useSyncExternalStore`.

## Logging

Runtime diagnostics go through `@ecopages/logger` with the `[schema-engine/forms-react]` package tag. Debug output is disabled by default; warnings and errors keep their severity and diagnostic details.

## Install

```sh
pnpm add @schema-engine/forms @schema-engine/forms-react @schema-engine/layout react react-dom zod
```

Install the [Schema Engine registry](../../registry) elements and recipes for your UI library. The imports below refer to the generated registration barrels in your application.

The recipes ship their CSS with them. Import it once in your global stylesheet, after Tailwind and into the `components` layer, so the card shell renders the `appearance` picks (`size`, `surface`) and your own classes override it:

```css
@import 'tailwindcss';
@import './components/schema-engine/forms/recipes/recipes.css' layer(components);
```

The control height of `size` is a separate, unlayered import after it, because a shadcn control's Tailwind height utility outranks every `components` layer rule:

```css
@import './components/ui/schema-engine/components/controls.css';
```

Controls that carry `data-se-control` (inputs, selects, number, masked and phone inputs, date triggers, the submit and wizard buttons) take `1.75rem` for `compact` and `2.25rem` for `comfortable`; no pick or `default` keeps your own height. [registry/README.md](../../registry/README.md#recipe-styles) lists them and the cost.

The path is relative to your global stylesheet: `./components/schema-engine/forms/recipes/recipes.css` from a Vite `src/index.css`, `../components/schema-engine/forms/recipes/recipes.css` from a Next.js `app/globals.css`.

## Render a form

```tsx
import { createFormEngine } from '@schema-engine/forms';
import { FormEngineProvider, FormRenderer } from '@schema-engine/forms-react';
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
		<FormEngineProvider engine={engine}>
			<FormRenderer config={config} onSubmit={(values) => console.log(values)} />
		</FormEngineProvider>
	);
}
```

`createFormEngine` comes from `@schema-engine/forms`. Register recipes explicitly to select them through `view.$type`.

The form container keeps its defaults apart from the live values, and clones them. A reset action restores the defaults, including authored and provider defaults, nested fields, and seeded array rows; an input without a default returns to its initial empty state.

## Form state

Each form instance has one state container, created with `createFormStateContainer` from `@schema-engine/forms/state-container`, made from the normalized config (its elements, `validationMode`, `reValidateMode` and `payload`), the engine's validation registry and the defaults. Its lifetime follows the identity of the normalized config, and it is the only form state. Validation timing, dependent re-validation, field arrays and the fields that take part (hidden and disabled ones do not) are the container's.

Submitting goes through the container: the provider guards a second submit and calls `container.submit()`, which validates the whole form and says how that ended. `passed` runs the actions and `onSubmit(values, { setServerErrors, fetch })` with exactly the values that passed (every submit trigger's `context.formData` and `onAction` carry them too; a value an action writes during the submission updates the form, not that submission), without the fields that took no part (hidden or disabled ones) and with the config's `payload` merged in; `setServerErrors` shows the server's answer to that submission on the fields it names (`FORM_ROOT` is the form). `fetch` is the engine's (`createFormEngine({ fetch, csrf })`): send the values with it and the engine's CSRF policy is applied to a same-origin unsafe request; actions get the same one as `context.fetch`. `invalid` focuses the first control that has an error, in document order; `overtaken`, when an edit outran the check, does nothing. A wizard step is validated with the container too, and a failed step marks nothing submitted.

The submission has one state, `{ status, failures, submitCount }`, the provider's own: `status` is `idle`, `pending` (while one runs), `success` or `error`. A reset returns it to a fresh form: idle, no failures, a count of 0. `failures` are issues with `source: 'submission'` (`actionFailed` and `noResult` with `params.actionId`, `callbackFailed`, `triggerFailed`, `validationFailed`), so the form's one formatter words them.

### Issue text

The container reports what is wrong (`type`, `ruleId`, `params`) and the application says it. `formatIssue` takes a `FormIssueFormatter`, `(issue, { path }) => string`, and is set on the engine (`createFormEngine({ formatIssue })`) for every form, or on `FormRenderer` or `FormProvider` for one form, which outranks the engine. A failed submission goes through the same formatter, as an issue of the form itself (`path` is `FORM_ROOT`):

```tsx
const formatIssue: FormIssueFormatter = (issue) => t(`form.errors.${issue.type}`, issue.params);

<FormRenderer config={config} formatIssue={formatIssue} />;
```

Keep the formatter's identity stable (define it at module level or memoize it): a new function on each render rebuilds the form state context.

Without a formatter, or when it returns an empty text, an issue shows its own `message`: the text the author wrote on the rule, or the one a server or control sent. With none of them it shows nothing, and never its rule type, so a field can be invalid with no text. Widgets mark themselves invalid from `invalid`, which `useFormField` returns, and not from the text. The registry submission alert falls back to its `errorMessage` only when a failure has no text.

React reports native validity too, as Radiant does: when `fieldProps.ref` lands on an input, select or textarea, the form reads its `validity` on attach, after each change, on blur and after each render, and reports it as the container's native facts (`valueMissing`, `typeMismatch`, `patternMismatch`, `tooShort`, `tooLong`, `rangeUnderflow`, `rangeOverflow`, `stepMismatch` and `badInput`, with the constraint as `params`). A number input that holds `1e` reports `badInput` instead of looking empty. The facts follow the form's validation timing, and a rule's error wins the display.

## Public entry points

| Import                                                | Purpose                                                                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `@schema-engine/forms-react`                          | Public components, including `FormEngineProvider`, `FormProvider`, and `FormRenderer`                           |
| `@schema-engine/forms-react/hooks`                    | The form state hooks, `FORM_ROOT` and the issue types; the engine, field, constraint, submission and view hooks |
| `@schema-engine/forms-react/contexts`                 | View context provider and context types                                                                         |
| `@schema-engine/forms-react/primitives`               | `FormElement`, `FormElements`, `defineRecipe` (binds a spec to components) and React recipe contracts           |
| `@schema-engine/forms-react/components/form-debugger` | `FormDebugger`                                                                                                  |

Use these from `/hooks` inside the active form:

| Hook                                         | Returns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useFormField(config)`                       | The field of an element, uncontrolled: `{ error, warning, issue, invalid, isTouched, isDirty, isValidating, required, disabled, defaultValue, fieldProps, labelProps, errorProps, containerStyles }`. The control keeps its own value, so the field renders for an error, a warning or a flag and never for a keystroke. `error` and `warning` are formatted texts, `issue` is the engine's error (`type`, `ruleId`, `params`, every issue in `all`), and `required` is evaluated against the element's constraints |
| `useFormField(config, { controlled: true })` | The same, plus `value`, `onChange(value)` and `onBlur()`, for a component that takes only `value` and `onChange` props (Radix, Base UI, react-aria, a date picker, a slider). The field renders whenever its value changes, and `fieldProps` has no change handler                                                                                                                                                                                                                                                  |
| `useFormField(path)`                         | The state and texts of a path alone (`error`, `warning`, `issue`, `invalid` and the flags), with no value and none of the config-derived parts; `FORM_ROOT` is the form itself. `useWatch(path)` reads the value                                                                                                                                                                                                                                                                                                    |
| `useFieldArray(path)`                        | `{ fields, append, prepend, insert, swap, move, update, replace, remove }`                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `useWatch(path?)`                            | The whole value tree with no argument, the value at a path, or the values at a list of paths, in order                                                                                                                                                                                                                                                                                                                                                                                                              |
| `useFormContext()`                           | `{ getValues, setValue, validate, reset, setFocus, formatIssue, clearSubmission, formState }`                                                                                                                                                                                                                                                                                                                                                                                                                       |

`useFieldArray` keeps falsy scalar rows such as `tags: ['', '']`. Errors and touched state move with their rows, and an operation that adds a row focuses its first control; dirty state is the comparison with the defaults, index by index. An operation naming a row that does not exist does nothing, `remove` removes a repeated index once, and `reset` gives every row a new id, and a `setValue` of the whole array keeps the ids by position.

`useFormContext`'s `formState` (`errors`, `isValid`, `submission: { status, failures, submitCount }`) is read lazily: a component re-renders only for the keys it reads, so a submit button that reads `submission.status` does not render while the user types. `errors` is flat by dotted path and holds the texts, and `isValid` reports the errors recorded without validating anything. `formatIssue(issue, { path })` words a field issue or a submission failure; `clearSubmission()` hides the last outcome.

The hooks read the container with the engine's pure selectors, so while hydrating, the selector hooks (`useFormField`, `useWatch`, `useFieldArray`) read the same server snapshot as the server render, which keeps hydration stable for defaults and array rows. `formState` reads the live container and is not part of that.

Use `useFormEngine`, `useFormInstanceActions`, `useFieldHost`, and `useConstraintLogic` from `/hooks`. View hooks (`useViewContext`, `useOptionalViewContext`, `useActiveStep`, `useFormNavigation`, and `useViewConfig(slot, schema)`, which returns the slot schema's output with every default filled) also come from `/hooks`.

## Consumer-owned fields and styling

`useFormField(config)` binds a field to the form's container and returns its state, control attributes and field chrome attributes. Spread `fieldProps` onto the control, `labelProps` onto its label, and `errorProps` onto its error message when present. These attributes describe semantics and state; applications choose their styling.

By default a field is uncontrolled: the control keeps its own value, `fieldProps` carries `onChange` and `onBlur`, and `defaultValue` (frozen when the field mounts, and the server's value while the form hydrates) is what the control starts with. The form reads what the user did from the control, and writes the container's changes back into it (a reset, `setValue` in code, a row update) only when the control differs, so the cursor, an IME composition and a number input's unparsable text stay where they are. For the same reason the form submits through `onSubmit` and never a React 19 `<form action>`, which would reset the uncontrolled fields after the action. A native `<button type="reset">` restores the defaults through the container.

```tsx
function TextField({ config }: { config: InputFieldConfig }) {
	const { defaultValue, error, fieldProps, labelProps, errorProps } = useFormField(config);
	return (
		<>
			<label {...labelProps}>{config.label}</label>
			<input {...fieldProps} type="text" defaultValue={fieldText(defaultValue)} />
			{errorProps && <p {...errorProps}>{error}</p>}
		</>
	);
}
```

A checkbox takes `defaultChecked={Boolean(defaultValue)}` (a checkbox with a `value` attribute reads and writes membership in an array), a radio group takes `defaultChecked={defaultValue === option}` on each radio, and a `select multiple` reads its selected options; every control of a group shares `fieldProps`, so give each its own `id` after the spread.

```tsx
{
	options.map((option) => (
		<input
			key={option}
			type="radio"
			value={option}
			defaultChecked={defaultValue === option}
			{...fieldProps}
			id={`${config.id}-${option}`}
		/>
	));
}
```

A component that takes only `value` and `onChange` props passes `{ controlled: true }`. The field then re-renders with its value, and `onChange(value)` and `onBlur()` replace the control's handlers.

```tsx
function DateField({ config }: { config: DateFieldConfig }) {
	const { value, onChange, onBlur, fieldProps } = useFormField(config, { controlled: true });
	return <DatePicker {...fieldProps} value={toDate(value)} onChange={onChange} onBlur={onBlur} />;
}
```

In development, an uncontrolled field whose `ref` lands on something that is not an input, select or textarea logs a warning that names `{ controlled: true }`.

The runtime exposes `se-*` class hooks and grid variables. Consumers do not need to scan the package's built files with Tailwind; applications own their styles, and registry components can bring their own UI library and styling dependencies. The layout stylesheet selects only `.se-grid`, `.se-grid-item` and `[data-se-theme]`; the hooks add `se-grid` and `se-grid-item` beside `se-form-grid` and `se-form-field`. Use `useFieldHost` for the grid host of custom elements (`useLayoutThemeId` gives the `data-se-theme` value for a host built by hand). A custom container whose children use `width` or `offset` spreads `useChildGridProps(elements)` on the wrapper of its `FormElements`, so the children lay out on the container's own grid. Fields, steps and the form element carry their resolved `appearance` as `data-se-<axis>` attributes (`FieldGroupRoot` and `useFieldHost` emit it, and the field's `className`, on the field host; `useFieldAppearanceAttributes` and `useFieldClassName` do it for a host built by hand), and `FormRenderer` emits the engine's layout theme stylesheet (grid and appearance token rules) once, and the form element carries `data-se-theme`. A step renders as `<div class="se-form-step" data-se-step="<id>">` carrying its authored `className` and custom-property `style`. Each step's grid is its own `grid` when it has one, else the form's.

## Engine-scoped config types

Element, recipe, and action config types come from the registrations passed to
each engine. `engine.defineForm` infers the engine's authoring inputs and
normalized outputs, including schema defaults and transforms. The React provider
and renderer preserve those engine maps through their props; registrations no
longer augment a global `FormEngine` namespace.

## Migration

- Import `createFormEngine` from `@schema-engine/forms`.
- Import the form state, runtime and view hooks from `/hooks`.
- Import `FormElement` and `FormElements` from `/primitives`.
- Replace `useFormInstance` with `useFormContext` from `/hooks`.
- Replace `useGDPRConsent` and `useGTMTracker` with `GDPRConsent` and `GTMTracker` from `@schema-engine/forms/browser`. `GDPRConsent` is a shared `GDPRConsentTool` backed by `localStorage` (`createGDPRConsent` builds one over other storage) and `GTMTracker` exposes static methods. Neither is a hook, so React state subscriptions belong to the application.

Styling and layout guides: [Styling and layout](../../apps/docs/src/content/docs/styling/overview.mdx), [Appearance axes](../../apps/docs/src/content/docs/styling/appearance-axes.mdx), [Theming](../../apps/docs/src/content/docs/styling/theming.mdx) and [Recipes](../../apps/docs/src/content/docs/styling/recipes.mdx).

See [Getting started](../../apps/docs/src/content/docs/forms-react/getting-started.mdx), [Hooks](../../apps/docs/src/content/docs/forms-react/hooks.mdx), and [Advanced usage](../../apps/docs/src/content/docs/forms-react/advanced.mdx).

Registry source type checks run through the registry workspace's `check-types`
task in Turbo. Renderer actions import the dispatcher from
`@schema-engine/forms/actions`.

## Validation, navigation and action contexts

The form container delegates validation to the engine's `validateFormValues`, and `FormProvider` creates one
[form runtime](../forms/src/runtime/README.md) (`createFormRuntime`) per form, keyed by the identity of the config and the
engine, with stable callback wrappers that read the latest `onSubmit`, `onChange`, `onAction` and `onActionResults`; it
mounts the runtime in an effect (`form_mount` once, then the change watch; the cleanup revokes any command in flight) and
provides it. The runtime owns the steps, the navigation (the one lock, the step triggers, skipped steps and the
`navigation` setting) and the submission: `onSubmit` runs inside the lifecycle, so a rejected `onSubmit` is a failed
submission, and a command that arrives while another is validating or running is `busy`. `useFormContext().formState.submission`
reads the runtime's snapshot (`status`, `failures`, `submitCount`), `useFormInstanceActions()` gives the current step id,
the step states and `next`, `back` and `goTo`, and a submit before the last step of a wizard is a Next. A reset of any kind
(`useFormContext().reset`, an action's `form.reset`, a native reset button, `container.reset()`) bumps the container's
`generation`, which returns the runtime to the first step and an idle submission. Every trigger dispatches the form's actions and then the
current step's (`collectStepActions`); `onAction` is typed by the engine's actions. Unmounting the provider, which a replaced config
causes, revokes the command in flight, so it dispatches no step trigger afterwards. Wizard Next validates nested fieldsets and live
array rows, and the container re-validates a field that failed by `reValidateMode`, so its error clears as soon as the value is valid.
A `require` constraint supplies both the control's required state and validation.
A `require` constraint on a fieldset or array makes every field inside it required,
nested containers included, and a disabled fieldset or array, authored or by a
constraint, disables every field inside it; a disabled array also disables its add
and remove buttons. `config.validationMode` and `config.reValidateMode` set the container's
modes; the config's own defaults apply (`onSubmit` and `onChange`), with nothing added by React. After a check
that failed, any explicit check, a submit or a step check (Next), passed or failed, the fields it covered
re-validate by `reValidateMode`.

Submission callbacks run
after the engine action lifecycle succeeds, and the container validates the
submission once. Step action metadata includes elapsed form time.
Action handlers receive a framework-neutral `context.form` with `reset`,
`setValue`, `getValue`, `validate` and `checkValidity`; `validate()` validates the form,
showing its errors, and resolves to its validity. `checkValidity()` validates the values
current at the call without recording or showing errors. `context.isValid` is true while
no error is recorded and never validates anything. `context.errors` is flat by dotted path. A trigger no action answers builds no context.

A changed `require` condition revalidates a touched or submitted dependent field.
Submission errors name the failing action by its configured `id`.

Form action lists support parallel groups as described in the [actions guide](../forms/src/actions/README.md). `onActionResults(results, trigger)` receives nonempty results for each trigger, including the full submitted sequence, action positions, errors and data. Successful `form_submit` actions call `onAction(action, data)` before the submission
callback. A rejected action callback aborts the remaining submit actions and runs
the error and completion triggers.

## Renderer conformance

Both renderer browser projects run the scenarios in
[`test-utils/renderer-conformance.ts`](../../test-utils/renderer-conformance.ts)
through their own `FormRenderer`. They cover array sibling constraints, empty
scalar array rows and the state that follows them, nested wizard validation,
required constraints on fields and containers, disabled arrays, `validationMode`,
nested error clearing, Valibot action registration, submission aborts, submit
attempt counts, and change and action callbacks, plus the parity checks of the shared layout (a field's font size, a text input that fills its field, the action bar's `align`) and of the spacing of the hero, split-screen and sidebar shells. Run this suite
with `pnpm exec vitest run --project browser test/conformance` from this package.
`test/ssr/nested-theme.acceptance.browser.test.tsx` runs the shared nested-theme
harness: a form on its own layout theme inside a grid item of another takes its own
appearance tokens, with the host stylesheet before and after the form's. It also pins a form nested in its own theme, a pick reached through plain wrappers, an outer pick inherited by a form that picks nothing, an author class on the element that carries the theme and the pick, and the documented limit of A in B in A without `@scope`.
