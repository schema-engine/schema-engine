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

Each form instance has one state container, created with `createFormStateContainer` from `@schema-engine/forms`, made from the normalized config, the engine's validation registry, the defaults and the config's `validationMode` and `reValidateMode`. Its lifetime follows the identity of the normalized config, and it is the only form state. Validation timing, dependent re-validation, field arrays and the fields that take part (hidden and disabled ones do not) are the container's.

Submitting goes through the container: the provider guards a second submit, begins a submission, validates the whole form with it and acts on how that ended. `passed` runs the actions and `onSubmit` with exactly the values that passed (every submit trigger's `context.formData` and `onAction` carry them too; a value an action writes during the submission updates the form, not that submission), without the fields that took no part (hidden or disabled ones) and with the config's `payload` merged in; `invalid` focuses the first control that has an error; `overtaken`, when an edit outran the check, does nothing. A wizard step is validated with the container too, and a failed step marks nothing submitted. `isSubmitting` and `submitCount` are the provider's own.

### Issue text

The container reports what is wrong (`type`, `ruleId`, `params`) and the application says it. `formatIssue` takes a `FormIssueFormatter`, `(issue, { path }) => string`, and is set on the engine (`createFormEngine({ formatIssue })`) for every form, on `FormEngineProvider` for the forms under it, or on `FormRenderer` or `FormProvider` for one form. The nearest wins: form, then provider, then engine:

```tsx
const formatIssue: FormIssueFormatter = (issue) => t(`form.errors.${issue.type}`, issue.params);

<FormEngineProvider engine={engine} formatIssue={formatIssue}>
```

Keep the formatter's identity stable (define it at module level or memoize it): a new function on each render rebuilds the form state context.

Without a formatter, or when it returns an empty text, an issue shows its own `message`: the text the author wrote on the rule, or the one a server or control sent. With none of them it shows nothing, and never its rule type, so a field can be invalid with no text. Widgets mark themselves invalid from `invalid`, which `useFormField` and `useControlledFormElement` return, and not from the text.

### Native validity

A controlled widget calls `onChange(value)` and relies on the engine's rules. A widget that wraps a native input with constraints can report what the control says with the value, `onChange(value, { native: { type: 'tooShort', params: { minLength: 8 } } })`, or `{ native: null }` when it reports itself valid; `useFormContext().setValue` takes the same option. The fact has the timing of a rule, and `type` is the `ValidityState` flag.

## Public entry points

| Import                                                | Purpose                                                                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `@schema-engine/forms-react`                          | Public components, including `FormEngineProvider`, `FormProvider`, and `FormRenderer`                           |
| `@schema-engine/forms-react/hooks`                    | The form state hooks, `FORM_ROOT` and the issue types; the engine, field, constraint, submission and view hooks |
| `@schema-engine/forms-react/contexts`                 | View context provider and context types                                                                         |
| `@schema-engine/forms-react/primitives`               | `FormElement`, `FormElements`, `defineRecipe` (binds a spec to components) and React recipe contracts           |
| `@schema-engine/forms-react/components/form-debugger` | `FormDebugger`                                                                                                  |

Use these from `/hooks` inside the active form:

| Hook                   | Returns                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useFormField(config)` | `{ value, error, warning, invalid, onChange, onBlur, name, required, disabled, ref }` for the field at `config.name`                                                     |
| `useWatchField(name)`  | The value at a path, or the values at a list of paths, in order                                                                                                          |
| `useWatchForm()`       | The whole value tree                                                                                                                                                     |
| `useFieldArray(name)`  | `{ fields, append, prepend, insert, swap, move, update, replace, remove }`                                                                                               |
| `useFormError(path)`   | The text of the error of exactly that path (`FORM_ROOT` is the form itself), by the formatter seam; `undefined` when there is no error or it has no words                |
| `useFieldState(path)`  | `{ error, warning, invalid, isTouched, isDirty, isValidating }`, where `error` and `warning` are the engine's objects (`type`, `ruleId`, `params`, every issue in `all`) |
| `useFormatIssue()`     | `(issue, { path }) => string \| undefined`, the formatter with the `message` fallback                                                                                    |
| `useFormContext()`     | `{ getValues, setValue, trigger, setFocus, formState }`                                                                                                                  |

`useFieldArray` keeps falsy scalar rows such as `tags: ['', '']`. Errors and touched state move with their rows, and an operation that adds a row focuses its first control; dirty state is the comparison with the defaults, index by index. An operation naming a row that does not exist does nothing, `remove` removes a repeated index once, and `reset` gives every row a new id, and a `setValue` of the whole array keeps the ids by position.

`useFormContext`'s `formState` (`errors`, `isValid`, `isSubmitting`, `touchedFields`, `submitCount`, `defaultValues`) is read lazily: a component re-renders only for the keys it reads, so a submit button that reads `isSubmitting` does not render while the user types. `errors` and `touchedFields` are flat by dotted path (a touched mark on a container covers the fields below it), and `isValid` reports the errors recorded without validating anything.

The hooks read the container with the engine's pure selectors, so while hydrating, the selector hooks (`useFormField`, `useWatchField`, `useWatchForm`, `useFieldArray`, `useFormError`, `useFieldState`) read the same server snapshot as the server render, which keeps hydration stable for defaults and array rows. `formState` reads the live container and is not part of that.

Use `useFormEngine`, `useFormInstanceActions`, `useControlledFormElement`, `useFieldHost`, `useConstraintLogic`, and `useSubmissionState` from `/hooks`. View hooks (`useViewContext`, `useOptionalViewContext`, `useActiveStep`, `useFormNavigation`, and `useViewConfig(slot, schema)`, which returns the slot schema's output with every default filled) also come from `/hooks`.

## Consumer-owned fields and styling

`useControlledFormElement(config)` binds a field to the form's container and returns its value, error, handlers, control attributes, and field chrome attributes. Spread `fieldProps` onto the control, `labelProps` onto its label, and `errorProps` onto its error message when present. These attributes describe semantics and state; applications choose their styling.

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

The form container delegates validation to the engine's `validateFormValues`, and the provider delegates step
state to `createStepMachine`, navigation (the in-flight guard and step triggers) to
`createStepNavigator`, and submission to `runSubmissionLifecycle` and
`createSubmissionGuard` from `@schema-engine/forms`: `onSubmit` runs inside the lifecycle, so a rejected `onSubmit` is a failed
submission, and a submit that arrives while one is validating or running is ignored. Every trigger dispatches the form's actions and then the
current step's (`collectStepActions`). Unmounting the provider, which a replaced config
causes, cancels the navigation in flight, so it dispatches no step trigger afterwards. Wizard Next validates nested fieldsets and live
array rows, and the container re-validates a field that failed by `reValidateMode`, so its error clears as soon as the value is valid.
A `require` constraint supplies both the control's required state and validation.
A `require` constraint on a fieldset or array makes every field inside it required,
nested containers included, and a disabled fieldset or array, authored or by a
constraint, disables every field inside it; a disabled array also disables its add
and remove buttons. `config.validationMode` and `config.reValidateMode` set the container's
modes; the config's own defaults apply (`onSubmit` and `onChange`), with nothing added by React. After a check
that failed, any explicit check, a submit or a step check (Next), passed or failed, the fields it covered
re-validate by `reValidateMode`.

`executeAction(action)` dispatches only that action. Submission callbacks run
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
