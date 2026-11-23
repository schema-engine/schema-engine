# @schema-engine/forms-radiant

Radiant/JSX adapter for the Schema Engine form system.

## Logging

Runtime diagnostics go through `@ecopages/logger` with the
`[schema-engine/forms-radiant]` package tag. Debug output is disabled by default;
warnings and errors keep their severity and diagnostic details.

`defineRecipe(spec, payload)` binds a spec to Radiant components: `payload.slots` must hold exactly the spec's non-shell slots, and `shell` is required when the spec declares a shell config. A missing or undeclared slot is a type error.

## Why the recipe components ship in this package

Unlike `@schema-engine/forms-react` — where the default view recipes live in the shadcn registry and consumers register them explicitly with `createFormEngine({ recipes })` — Radiant has no registry ecosystem to lean on. The shells and step blocks are therefore part of this package and `createRadiantFormEngine()` binds the canonical recipes automatically, so the package stays plug-and-play. The recipe specs themselves remain canonical in `@schema-engine/forms/recipes/built-in`.

## Install

```bash
pnpm add @schema-engine/forms-radiant @schema-engine/forms @schema-engine/layout @ecopages/radiant-ui @ecopages/radiant @ecopages/jsx @ecopages/signals zod
```

[Installation and quick start](../../apps/docs/src/content/docs/forms-radiant/getting-started.mdx) has the peer ranges, the JSX setting, the three stylesheets and a form that renders and submits. [Server rendering and engine binding](../../apps/docs/src/content/docs/forms-radiant/server-rendering.mdx) says how to assign the engine to server-rendered forms.

First-party schemas use the functional `zod/mini` API. Install the `zod` package when authoring schemas; registrations supplied by consumers may use any Standard Schema provider.

## Quick start

```ts
import { createRadiantFormEngine, FormRenderer, schemaFormRegistrations } from '@schema-engine/forms-radiant';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

<FormRenderer engine={engine} config={formConfig} onSubmit={handleSubmit} />;
```

`engine` is a live JavaScript value. `se-form-renderer` publishes it to descendant hosts through `formEngineContext`. A host resolves its engine from an explicit `engine`, then the nearest `se-form-renderer` context, then the render in progress, and follows the renderer's context when it changes.

### Registering only the elements a form uses

`schemaFormRegistrations` is every built-in element — the convenient default,
and the right choice while a form's `$type` set is still moving. Each
registration is also its own named export from the `/registrations` subpath, so
an app whose forms only ever use a known subset can pass just those instead:

```ts
import { createRadiantFormEngine } from '@schema-engine/forms-radiant';
import { InputElementRegistration, SelectElementRegistration } from '@schema-engine/forms-radiant/registrations';

const engine = createRadiantFormEngine({
	elements: [InputElementRegistration, SelectElementRegistration],
});
```

This is why elements are registered by explicit array rather than
auto-discovered from installed packages: a form's `$type`s are runtime data,
not static imports the engine can see ahead of time, so it has to be told.
Passing the narrower array is the only lever an app has for trimming what
ships to the browser through this package's single bundled entry point.

Get the array wrong and it fails loud, not silent: an unregistered `$type`
renders an inline error naming the exact type, in place of the field, in both
development and production. Nothing to guard against beyond testing the pages
that render forms.

## Rendering architecture

View-owned shell, same authoring model as radiant-ui: the `FormRenderer` / `FormInstance` views author the whole form tree as light-DOM children (authored children, no `<slot />` written by hosts), and `se-form-renderer` / `se-form-instance` are behavior-only hosts that publish context. There is no derived tree at the form level.

- The engine validates; no field validates. `se-form-instance` creates one [form runtime](../forms/src/runtime/README.md) (`createFormRuntime`) per form from the normalized config, the engine and the defaults; the runtime builds the form's container from the engine's validation registry, the defaults and the config's `validationMode` and `reValidateMode`, and the instance hands that container to its `rui-form` with `connect`. The container owns values, validation timing, touched and dirty state, validation dependencies, participation (hidden and disabled fields), field arrays and their row ids; `rui-form` is only the control bridge: it writes each control's value and native validity (a native input marked `data-rui-control`; the engine's Radiant widgets render only `type` as native evidence, so required and length come from the engine's rules) into the container and presents what the container holds. `FormField` takes the config's own `required` flag only, which reaches `se-field` as `data-se-required` and as `rui-field`'s `required` property, which `rui-field` reads for `aria-required`. A new config, engine or `defaultValues` builds a new runtime and container, so pass a stable normalized config (`engine.validateForm` returns the same object for one it already normalized). A config that came through server markup is normalized by the engine again before the container reads it.
- The engine of a server-rendered form is not serialized, so the app binds it explicitly by assigning `engine`, a `@prop`, to each `se-form-renderer`, before or after the renderer upgrades: a value assigned to an element before it is defined is adopted when it upgrades. `se-form-instance` and `se-form-array` take the engine from their own `engine`, then the renderer's context, then the render in progress, and subscribe to that context, so an engine bound or replaced on a connected renderer reaches them. An `engine` assigned to an instance directly wins over the renderer's. A client router that swaps in a parsed page binds the engine to the incoming renderers before the swap; see the docs' [engine binding](../../apps/docs/src/content/docs/forms-radiant/getting-started.mdx). A client render through `FormRenderer` passes the engine itself. There is no module-level engine and no fallback to the only engine created.
- `FormRenderer`'s typed props are the one way to receive the submitted values: `onSubmit`, `onAction` and `defaultValues` take their types from the normalized config (`engine.defineForm` of a literal config, or `engine.validateForm(json, { values })`), else `FormValues`, and `onChange` is always `FormValues`. The callbacks reach `se-form-instance` from the view through a `ref` and an internal channel (`lib/instance-callbacks.ts`), so the element has no property to assign and its class is not exported from the package. Without an `onSubmit`, a form with `action` or `method` posts natively, which is also how a form rendered on the server submits. `rui-form` is connected to the container as it is: each of `select`, `combobox`, `radio`, `checkbox-group` and `slider` wraps its Radiant UI control in a host that holds the value its element declares (see below).
- `se-form-instance` runs a submission through the runtime and keeps only what an element can do. The runtime owns the submitting state, the attempt count, the one lock, the steps and every action; the instance mounts it on connect, unmounts it on disconnect (the cleanup revokes the command in flight) and gives it the `host`: `focus` (the first invalid `se-field` or `rui-field` among the paths, in document order, usable outside a submit), `rui-form`'s `sync()` and `submitNatively`. `rui-form` syncs its controls into the container and calls the instance's `submitHandler`, which calls `runtime.submit()`: on the last step it runs `container.submit()`, then the actions and `onSubmit(values, { setServerErrors, fetch })` with exactly the values that passed (`setServerErrors` shows the server's answer on the fields it names, `FORM_ROOT` is the form; `fetch` is the engine's, with its CSRF policy applied); `invalid` moves to the first step with an error and focuses its first field; `overtaken` (an edit or a row move outran the check) submits nothing. A validation that cannot run (a validator threw, a service was down) is logged and ends the submission `failed`, with status `error` and a `validationFailed` failure; it is not an attempt, and it announces `se-action-submit-invalid` with those failures. A second submit while one validates or runs is ignored (`busy`). The context's `submission` is the runtime's (`status`, `failures`, `submitCount`), and the submit buttons of `se-form-actions` and `se-wizard-actions` show their `submitting` label and disable while its status is `validating` or `submitting`. The three events are derived in one place, from the runtime's submission status: `se-action-submit-start` when a submission passed validation and is being handled (its status becomes `submitting`, where the `form_submit_start` trigger fires; an invalid or overtaken submission never starts), `se-action-submit-invalid` when its validation ended without a start (`se-submission-alert` shows its `error` state on it; a Next that fails is no submission): `detail.failures` is empty when fields have errors and otherwise names why validation could not run (`validationFailed`) or why the values do not match what the form declares (`valueMismatch`, one per path), and `se-action-submit-complete`, which only follows a `se-action-submit-start`, when it ended, with `detail.succeeded`, `detail.results` (those of the submit actions) and `detail.failures` (the issues the runtime recorded, such as `callbackFailed`, `triggerFailed` and `actionFailed`; empty on success); a form emits no `rui-submit` or `rui-invalid` while the instance owns the submission. With no `onSubmit`, a form with `action` or `method` submits natively, posting the submission's values (the config's `payload` included, a field a constraint hid or that is disabled left out), with nested values named by dots, rows of records by index (`contacts.0.email`), lists of plain values by repeating the name, files as files, and booleans as a native checkbox sends them (`true` is `'on'`, `false` is nothing) through a one-shot `formdata` listener, only after its actions, including `form_submit_success` and `form_submit_complete`, have run and succeeded; pass `action` and `method` to `FormRenderer`, and Radiant UI copies them onto the inner `<form>`. When the engine's CSRF policy names a `field`, the instance asks `csrfFieldFor(engine.getCsrf(), form)` right before the post: a same-origin `post` gets a hidden input of that name with the current token (added or updated), and any other form, or a token an earlier post left, has none. `onSubmit` runs inside the action lifecycle, after the submit actions and before `form_submit_success` or `form_submit_error`, so a rejected `onSubmit` is logged, runs the error and complete actions instead of the success actions, and completes unsuccessfully. `se-submission-alert` follows those events. A native reset (`resetHandler`), an action's `form.reset` and `FormController.container.reset()` are the same reset: the container's `generation` goes up and the runtime returns to the first step and an idle submission, revoking a command whose values were not yet captured; a submission whose values were already captured (`submitting`) is committed and publishes its outcome after the reset.
- `FormRenderer`'s `onChange` receives the container's nested values, and only when a value changed: touching a field, blurring it, recording an error and counting a submission change the container's state but not its `values` object, so they call neither `onChange` nor the `form_change` actions. Successful submission actions call `onAction` with their normalized action and the same nested values. Submission actions read a fresh snapshot for each lifecycle trigger, and retain one form operations object so step timing resets on navigation. Wizard navigation is the runtime's: `next()` syncs the controls and validates the step's own fields with `container.validate(paths)`, and a failed step marks nothing submitted, so a later step stays clean; `back()` and `goTo(id)` follow the config's `navigation` (`linear` or `free`); steps whose constraints hide them are skipped. The instance context publishes `current` (the step id), `steps` (every step with `skipped`, `visited`, `complete` and `invalid`), `navigating` and the commands `next`, `back` and `goTo`; there is no `markStepCompleted` or `markStepVisited`, so no element can fake progress. The runtime dispatches `step_leave`, `step_change` and `step_enter` when the current step changes, and ignores a command while another is in flight. Every trigger dispatches the form's actions and then the current step's (`collectStepActions`); a new config builds a new runtime, which fires `form_mount` again. There is no action element to place or look up, and `se-form-renderer` has no `onSubmit`: pass the callback to the renderer's `FormRenderer` view. A config change builds a new form; disconnecting the instance revokes the command in flight.
- `form_mount` actions run once for each runtime built for a live form: a new config, engine or `defaultValues` is a new form, and moving or reconnecting the instance is not.
- Action handlers read `context.errors` by dotted path (`errors['address.street']`), as in React, each with its `all` list of issues. `context.isValid` is true while no error is recorded, `context.form.checkValidity()` validates the current values through the container without recording errors, and a trigger no action answers builds no context, all as in React. `userInteractions` counts touched fields plus `submitCount`, which counts submissions that passed or failed validation since the last reset; a Next (or a submit that acts as one) is not one, and neither is a validation that could not run or a submission an edit overtook. Action lists support parallel groups as described in the [actions guide](../forms/src/actions/README.md). The bubbling `se-action-results` event carries `detail.trigger` and nonempty `detail.results` for each trigger, including action identifiers, positions, outcomes, errors and data. The `se-action-submit-complete` event also includes the full submission results and failures.
- The full normalized config is serialized once on `se-form-instance`. Recipe chrome receives one small `FormMeta` with form and step titles, descriptions, and ids; the same `FormMeta` is published on `formInstanceContext`, which is where the debugger reads it.
- Every step's fields are authored once inside `se-form-step`, which carries `data-se-step`, the step's authored `className` and its custom-property `style` (the `[hidden]` binding is unaffected); hosts (keyed by `stepId`) bind their own `hidden` attribute to the instance's current step (the view writes it only for the server markup; from connect on the step owns it and follows every value the instance publishes, so a wizard that becomes a non-wizard shows its steps), so SSR emits the full form and step switching is pure DOM. A native submit (Enter in a text input) before the last step of a wizard is a Next in the runtime (submit as Next), whatever the number of fields.
- Server-rendered constraints use the nested authored and caller defaults. Each field shares one constraint snapshot between its visibility wrapper and registered renderer. Live updates preserve an authored `disabled: true`, including when an `enable` constraint matches. A field's `disabled` and `required` compose its own authored state with every constraint wrapper around it, so a child of a constrained fieldset keeps its own `disabled`; a fieldset disabled by authoring or by a constraint renders its children disabled, and one required by a matching `require` constraint renders them with their required marker, and the constraint hosts keep them so. An array passes both to its rows the same way: a disabled array, authored or by a constraint, renders its rows and its add and remove buttons disabled, and an authored `disabled` array's rows stay disabled while its constraints change. Constraints are never evaluated in a renderer: read `selectFieldState`, or `resolveParticipation` for a standalone element.
- Conditional fields with constraints are wrapped in an `se-constraint` host (class `.se-form-constraint`) that carries its rendered path as `data-se-constraint-field` (the path the server snapshot was evaluated with; an element without a name is keyed by its authored `id` under its enclosing array row or object, so its sibling references resolve there). The view passes the plain `hidden` attribute for the server markup. Once the instance has a container, the host and the `se-field`s read `selectFieldState(snapshot, path)` from it: the container evaluates every constraint once, in order, with the values of skipped steps and hidden fields absent, so `hidden`, `disabled` and `required` (with the containers around the field folded in, authored `disabled` included) agree with validation and with React. The host writes the native `hidden` property and a field follows its own `disabled` and `required`; there is no constraint evaluation in the element and no values feed from the instance. A `require` toggles what the field announces (`aria-required`) and `[data-se-required-marker]` on the label, and the container re-validates the field when it was touched or its check failed. A field with no `se-constraint` around it gets no live hiding.
- Resolved `appearance` is emitted as `data-se-<axis>` attributes on `rui-form`, `se-form-step`, each field host (`FieldGroup` and `FormField` take `appearance`) and the card, hero, split-screen and sidebar shells, next to `data-se-theme` on `rui-form` and the layout theme's stylesheet, which carries the token rules. `src/styles/appearance.css` and the shell CSS only read the semantic tokens (`--se-space`, `--se-font-size`, `--se-control-height`, `--se-border-width`, `--se-shadow`, `--se-surface-background`). The built-in tokens name no host theme, so Radiant's fallbacks live in its CSS: the card pads with `var(--se-space, var(--space-6, 1.5rem))` (the hero, split-screen, sidebar and stack shells read `--se-space` for their padding and gaps the same way), and the card's width is the readable measure `--se-measure` (28rem unpicked, 24rem compact, 32rem comfortable).

    The size axis reads two spacing hooks, `--se-space-compact` and `--se-space-comfortable`. Each reads the author hook, then the renderer property of the same name (`--se-renderer-space-compact`, `--se-renderer-space-comfortable`) that `src/styles/appearance.css` declares on the form element (every `[data-se-theme]` that is not a grid or an item) from Radiant UI's spacing scale, `--space-4` and `--space-8`, with `1rem` and `2rem` as fallbacks, so a spacing pack (`compact`, `comfortable`, `wide`) changes a size pick. Radiant UI defines no `--space-block*` tokens; the shell and element CSS read `--space-4`, `--space-6` and `--space-8` the same way, and `appearance.css` maps `--space-block-lg` and `--space-block-xl`, the hooks the layout theme's `loose` and `wide` grid gaps read, onto `--space-6` and `--space-8` on `:root` (an app's own unlayered rule for either wins, since `index.css` is unlayered; a gap the grid theme sets itself never reads them). A unit test (`test/lib/radiant-ui-tokens.test.ts`) fails when the renderer CSS reads a custom property that neither Radiant UI nor the renderer defines. A host follows its own rhythm by setting those scale tokens, or sets the hooks themselves on `:root`, any ancestor or the form's class (the nearest wins, as in React).

    The same file maps the control height. `--se-renderer-control-height-compact` and `--se-renderer-control-height-comfortable` are declared on the form element from the theme's `--size-control-sm` and `--size-control-lg` (fallbacks `1.75rem` and `2.25rem`), so a `compact` form uses the theme's small control and a `comfortable` one its large control, unless an author set `--se-control-height-compact` or `--se-control-height-comfortable` on `:root`, an ancestor or the form: Radiant never declares those, so they reach the pick and win. The renderer properties sit on each form, so a form nested below a wrapper that sets `--size-control-sm` follows that wrapper; the neutral layout theme reads `var(--se-control-height-compact, var(--se-renderer-control-height-compact, 1.75rem))`. Radiant UI sizes inputs, selects, number fields and the default button from `--size-control-md`, which its theme sets on `:root`, or on a wrapper when the theme is scoped. A rule on `[data-se-size]` assigns `--size-control-md: var(--se-control-height, var(--se-radiant-control-md))`, where `--se-radiant-control-md` is a copy of the theme's value, taken where nothing replaces it: on `:root` and on the element that directly holds a form's theme root (a wrapper with its own `--size-control-md` is seen too). The rule never reads `--size-control-md` on its own right-hand side, which a form element that carries the theme and the pick together would turn into a circular `var()`. With no pick no element matches, so the theme's `--size-control-md` applies untouched; a `default` pick hands the token back, so it restores the copy, also inside a `compact` form. The size buttons (`sm`, `lg`) keep their own theme values, and so does the select's toggle, which Radiant UI sizes from `--size-control-sm`: the select's trigger follows `--size-control-md`, so a `compact` select is the toggle plus its border, 2px taller than the other controls (30px against 28px in the default pack).

- Every `se-*` host declares its public props with `JSX_PROPS`, and the views render the host class (`<FormStepElement stepId={id} />`), so a misspelled or dead prop is a compile error; internal `@state` is `protected`. A `se-split-screen-side` without `meta` renders its children.
- `FieldGroup` composes the label, required marker, description and error for every field element, checkbox, switch and radio included, and `RequiredMarker` is the one marker `se-field` toggles for a constraint. A field without a `label` renders the label from its `name`, visually hidden (`.se-visually-hidden`), so the control keeps an accessible name. `FormRenderer`, `FormElements`, `FormElement` and `FieldGroup` take `class`, not `className`. The input and textarea views forward every parsed config key (`autoComplete`, `autoFocus`, `inputMode`, `spellCheck`, `cols`, `wrap`, `resize`). An array renders as a `fieldset` named by its label, its error in a `[data-rui-field-error]` region, and each remove button is named `<removeButtonText> <row number>`; the drop zone outlines itself while its file input has keyboard focus.
- Recipe chrome blocks read serializable `meta` / `slotConfig` props (the block's own slot config, not the whole view) plus the live `formInstanceContext` (a value that is absent before the instance publishes, and that carries the form `meta`); where SSR cannot resolve context (authored children serialize before providers publish), they fall back to the initial step-0 state and hydrate the live values.
- Published JS must keep element registrations: `sideEffects` marks the compiled chunks so bundlers do not drop the bare script imports.

### Script and view files

A behavior host large enough to read as its own unit lives in a `*.script.tsx`
file beside its view, matching radiant-ui: the script owns the
`@customElement` class, the view owns the JSX, and the view re-exports the
element so importing the view registers it.

```tsx
// form-instance.script.tsx
@customElement('se-form-instance')
export class FormInstanceElement extends RadiantElement { … }
```

```tsx
// form-instance.tsx
/** Registers `<se-form-instance>` when this view is imported. */
import { FormInstanceElement } from './form-instance.script';

export { FormInstanceElement };

export function FormInstance({ config, … }) {
	return <FormInstanceElement config={config}>…</FormInstanceElement>;
}
```

The `engine` is used to render the recipe. The enclosing `se-form-renderer`
publishes it through `formEngineContext` for the instance host and its descendants.

The split is a bundle boundary, not a filing preference. The view is evaluated
at build time to produce HTML and never reaches the browser; the script is the
only part that ships. A component with no behavior therefore has no `.script`
file and costs a page nothing, which is why `heading` and `chip` in radiant-ui
are view-only.

The re-export is what carries the registration at the source level: without it,
a view that only named `'se-form-instance'` as a string literal would have no
reference to the script module at all. The package's `sideEffects` entries
also retain the published entry point and chunks when a consumer bundles them.
`internals/form-renderer.script.tsx` is the same shape.

Radiant maps camelCase `@prop` names to kebab-case HTML attributes. For raw
HTML, write `default-country`, `input-mode`, and `max-files`; JSX property
names stay camelCase.

Behavior that does not need the element — DOM queries, value diffing, path maths
— belongs in `lib/` instead, where it is testable without registering a custom
element: `lib/authored-disabled.ts`, and
`lib/validation-deps.ts` are the existing examples.

## Grid layout

Responsive grid layout is **pure CSS**. The layout theme owns the grid vocabulary —
breakpoint thresholds, gap tokens, and the default minimum column width — via
`createRadiantFormEngine({ layout: { grid: { breakpoints, gap, minColumnWidth } } })`
(or a theme compiled with `createLayoutTheme` from `@schema-engine/layout`, shareable between engines);
forms describe their layout with `columns`, `gap`/`gapX`/`gapY`
(`none | compact | default | loose | wide` or a CSS value), `responsive`
entries per breakpoint, `areas` rows for a drawn layout, and per-field placement
(`grid.width`/`grid.offset` names on a 12-track grid, `grid.area` names from the
`areas` template, or raw `grid.column`/`grid.row` lines) with per-breakpoint
`hidden` overrides. A step's own `grid` replaces the form's for that step.

The renderer emits the layout theme's one stylesheet (scoped to
`data-se-theme`, grid rules and appearance token rules together) and the form's CSS variables inline
during render, so
SSR output is styled with no FOUC and hydration is not required for layout.
Media queries follow the viewport width. Sparse responsive entries inherit
from the preceding breakpoint, then the top-level value; `gapX`/`gapY` beat an
entry's `gap`. Only authored values are emitted inline — the generated
stylesheet supplies the defaults, chains each breakpoint back through the
narrower ones, and resets the variables at every host so nested grids stay
isolated. The stylesheet selects only `.se-grid`, `.se-grid-item` and `[data-se-theme]`: the
renderer adds `se-grid` beside `se-form-grid` on step grids and container inner grids, and
`se-grid-item` beside `se-form-field` on field hosts (`mergeFieldGridHost`,
`mergeChildrenGridHost`). Breakpoint thresholds in the theme must keep named order
(`sm ≤ md ≤ lg ≤ xl ≤ 2xl`); `rem`/`em` compare at a 16px root.

Radiant has no head hoisting, so unlike `@schema-engine/forms-react` (which hoists equal stylesheets
by `href` into one element) every form carries its own identical, self-contained
`<style data-se-theme-css="<id>">`. That is deliberate: each form is styled before hydration
whatever the render order, streaming, caching or removal of the other forms, and the repeated
copies compress to almost nothing (about 350 B gzip for three forms). Sharing one element would
need per-render state. `@ecopages/jsx/server` offers that through its render scope, but this
package's browser bundle cannot import it, and a host such as Ecopages renders each component
separately, so the state would not span the page. On a page with very many Radiant forms, WebKit spends more time styling, because each form carries
its own copy (a one-off headless run with one small form per copy: about 37 ms for 25 forms and 390 ms for 100,
against 3 and 11 ms with one copy; Chromium and Firefox stayed under 17 ms for 100). For the usual page it is negligible. A host that wants the rules in its own head or critical stylesheet can
serve the theme's `css` as well; the per-form copies stay and hold the same rules:

```ts
const { id, css } = engine.getLayout();
const head = `<style data-se-theme-css="${id}">${css}</style>`;
```

## MVP elements

- input, textarea, number, select, checkbox, switch, radio, submit-button

Fields and array components share the form instance's container through
`FormController`, which gives a host the form's `container`, `select` signals and `formatIssue`. `FormFieldElement` extends
`RuiFieldElement` with no form access of its own (construct a `FormController` on
it when needed); Radiant UI retains control registration and error
presentation, and the engine's container validates. `config.validationMode` and
`config.reValidateMode` set the container's timing; unset, fields validate on
submit and re-validate on change after a failed check.

### Form state and controls

A form's state is the engine's container, which `se-form-instance` hands to its `rui-form` with `connect(container, { formatError, submitHandler, resetHandler })`. `rui-form` bridges the controls: it sends each control's value, blur and native validity into the container and presents what the container holds. The controls are Radiant UI's own, and they dispatch the platform's `input` and `change` events on the host (`rui-change` is only for components that are not form controls). A custom control registers with `registerFieldControl`, dispatches those two events and calls `announceControlConnect(this)` when it connects.

The docs cover [Form controls](../../apps/docs/src/content/docs/forms-radiant/form-controls.mdx), [Form state](../../apps/docs/src/content/docs/forms/form-state.mdx), [Native validity](../../apps/docs/src/content/docs/forms/native-validity.mdx), [Wizard and runtime](../../apps/docs/src/content/docs/forms/wizard.mdx) and [CSRF](../../apps/docs/src/content/docs/forms/csrf.mdx).

### Issue text

An issue carries identity for translation (`type`, `ruleId`, `params`, `source`) and a `message` only as a fallback. Give the engine a `formatIssue` once (`createFormEngine({ formatIssue })`), the same `FormIssueFormatter` the React renderer uses, and every form reads it from `engine.getIssueFormatter()`. `FormRenderer` (published by `se-form-renderer`, so every form below it) takes one `formatIssue` to override it for its forms; the renderer's wins over the engine's:

```tsx
const formatIssue: FormIssueFormatter = (issue, { path }) =>
	issue.message ?? t(`form.errors.${issue.type}`, issue.params);

const engine = createRadiantFormEngine({ formatIssue });
<FormRenderer engine={engine} config={config} />;
```

`rui-form` shows the formatter's text, or the issue's `message` when it returns nothing. With no formatter an issue shows its `message` and otherwise nothing, never the rule type.

The controller provides `container` (every command and read: `setValue`, `validate`, `fieldArray`, `getSnapshot`), `select` signals over a selector of the container's snapshot (`fromExternalStore`), and `formatIssue(issue, { path })`. See the [controller API](./src/adapters/radiant/controller/README.md) for examples.

`arrayElements` takes its rows from the container's `rowIds` and shows its own error (`errors[name]`). A `minItems` rule in
`rules` checks the row count at submission. The `minItems` config property seeds
the initial row count, and the built-in Remove control keeps that count as its
floor. `maxItems` caps the built-in Add control. `initialValues` is merged over
child `defaultValue`s for rows created by Add or to meet the `minItems` floor.
Rows supplied through form `defaultValues` are included in server markup with
deterministic IDs. The server serializes the container's snapshot (`toHydration(container.getServerSnapshot())`) as the instance's `hydration` prop, and the first form of a server-rendered instance starts from it, keeping the rows the server rendered. During hydration, the connected array host retains those row
nodes even when the array view has no JSX binding markers of its own. The array host reads its engine from the renderer's context and registers with the form once it has one. Its error is a controlled `RuiFieldError`; the array fieldset's `aria-describedby` points at it while it shows a message. Direct
`container.fieldArray` mutations do not apply the
array config's Add and Remove behavior. The host holds its row ids in a signal and renders the rows
with `MapItems`, keyed by row id, so an add, remove or reorder patches only the rows that changed
(a row whose index moves has its field names and remove label updated in place); the step indicators
render the same way, keyed by step id.

`select`, `combobox`, `radio`, `checkbox-group` and `slider` are custom hosts (`se-select`, `se-combobox`,
`se-radio-group`, `se-checkbox-group`, `se-slider`) around the Radiant UI control of the same name, all built on
`ControlHost` (`lib/control-host.ts`; `ChoiceHost` in `lib/choice-host.ts` adds the options of the four choice
elements) and registered with `registerHostControl` in `wraps` mode. Radiant UI's controls keep text (`rui-select` and
`rui-combobox` a list of strings, even for a single choice, `rui-radio-group` a string) and the slider a list of
numbers, while the host's `value` is the one its element declares: the option's own value (a number stays a number),
a list of them with `multiple` or for a checkbox group, and a number for the slider. Each element owns its mapping
in `toControl` (the declared value to what the control holds) and `fromControl` (back); the host does the rest the
same way for every control. It writes `value` into the control when the form writes it (a default, a reset,
`container.setValue`) and dispatches nothing then, stops the control's own `input` and `change` and dispatches the
native ones on itself once `value` holds the new value, reports the control's native validity, paints the field's ARIA
onto the control's own target (`data-rui-aria-target`) with `@bindTo(fieldAriaBindings(selector))` on the field's context, which Radiant UI 0.6.1 marks as the field's so the control looks for no label of its own, and calls `announceControlConnect(this)` when it connects.

`registerHostControl(tagName, { mode })` is the one registration of a host with `rui-field`, in one of two modes. In
`wraps` mode the host wraps a Radiant UI control (`ControlHost`): it is not form-associated, `rui-form` posts the
submission's values (`submission: 'none'`) and the field reads the validity of the control inside it. In `owns` mode the
host renders its own control: a form-associated host (`se-phone-input`, `se-input-otp`, `se-masked-input`) submits itself
(`submission: 'host'`) and holds text, which the field writes as text, and `se-drop-zone` (`held: 'files'`) holds a list of
files and leaves the name to the file input inside it (`submission: 'native'`). Each host reads `fieldContext`, calls
`announceControlConnect(this)` when it connects and announces a user's change with `emitControlChange` and
`emitControlCommit`.

`masked-input`, `phone-input` and `input-otp` are form-associated custom elements
registered with `registerHostControl` in `owns` mode, as `drop-zone` is (it holds `files`). Each exposes its value as
`value`, and a form reset or `container.setValue` repaints it. Each host
declares its ARIA target with `hostAttributes` and paints the field's `id`,
label and ARIA onto it declaratively: it reads `fieldContext` with
`@contextSelector` and spreads `fieldAria(field)` from
`@ecopages/radiant-ui/field` on the control it renders, so the field writes
nothing on the host and observes no mutations. They submit through native `FormData`
and, like Radiant UI's own form controls, dispatch the native events: `input` on the host for each user change and `change` once when the change is committed (a paste, a pick, a drop, or focus leaving the control), never for a value set from code. Each host announces itself with `announceControlConnect` when it connects. The OTP keeps one entry per slot, so a
character stays in its slot; its value is the slots joined, and an incomplete
code is a shorter string. The `input-otp` field schema adds a default `pattern` rule that accepts an empty code or one with every slot filled and reports "Enter all N characters" (or the config's `incompleteMessage`) otherwise, unless the author wrote a `minLength`, `maxLength` or `pattern` rule, so `validateForm` output and headless `validateFormValues` carry it too. `drop-zone` is registered
with its file input as the submitted control, and its host exposes the accepted
files as `files`.

The forms-radiant input views take no element-level `onChange`, `onBlur` or
`onFocus`: observe values with `FormController.select` or the native `input` and
`change` events (`rui-change` is only for non-form Radiant UI components such as tabs).

Field schemas live beside each registration under `src/elements/` (for example `form-input.types.ts` next to `form-input.registration.ts`). Component props stay on the widget modules. Radiant does not ship `date` or `date-range` widgets; those `$type`s exist only in the shadcn registry today. Registry and Radiant schemas may diverge where capabilities differ.

Custom container registrations declare `containerKind: 'array'` or
`containerKind: 'object'`. The forms engine uses this registration metadata to
compose defaults and validation paths, independent of the widget `$type`.

## Development

```bash
pnpm build:lib
pnpm test:all
pnpm storybook   # port 6007
```

From monorepo root: `pnpm dev:radiant-storybook`.

Stories default to **client** render. Use the Storybook toolbar **Radiant render** control to spot-check `ssr-hydrate` and `ssr-static` on any story — same contract as radiant-ui. Play functions skip `ssr-static` (markup-only iframe, no client module). SSR layout acceptance renders the real `RecipeRenderer` through `renderToString`: `test/ssr/grid-layout-ssr.markup.test.ts` checks the emitted stylesheet and field variables, and `test/ssr/grid-layout-ssr.acceptance.browser.test.ts` loads that HTML in an isolated iframe without app JS and checks layout at two widths, including the named width layout, a drawn areas layout, and a step that draws its own template beside a step on the form grid. `test/ssr/nested-theme.acceptance.browser.test.ts` embeds a form on its own layout theme in a grid item of another and checks that the nearest theme's appearance tokens win with the host stylesheet before and after the form's. Both share `test-utils/` with the React package.

Published JavaScript files are marked as side effects so bundlers preserve
custom element registration for every entry point. Supported Radiant peers are
`>=0.12.0` (JSX, Radiant and Signals) and `>=0.6.1` (Radiant UI).

### Recipe chrome

Custom shell props and slot factory contexts receive `meta`. Import `FormMeta` from
`@schema-engine/forms-radiant` when annotating these inputs, and read chrome from
`context.meta.steps`. Metadata includes form and step ids, titles, and descriptions;
it omits elements, rules, defaults, and actions. Keep field rendering in the
recipe content supplied by the renderer.

### Engine-scoped config types

Element, recipe, and action config types come from the registrations passed to
each engine. Use `engine.defineForm` to infer authoring inputs and normalized
outputs for that engine. Radiant renderer props accept `FormEngineRuntime`, which
omits registration extension.

### Shared renderer conformance

The browser project also mounts `FormRenderer` for the shared
[`renderer conformance scenarios`](../../test-utils/renderer-conformance.ts):
array sibling constraints, the state that follows scalar array rows, nested wizard
validation, required constraints on fields and containers, disabled arrays,
`validationMode`, nested error clearing, Valibot action registration, submission
aborts, overlapping and rejected submissions, submit attempt counts, and change and action callbacks. It also holds the parity checks of the shared layout (a field's font size, a text input that fills its field, the action bar's `align`) and of the spacing of the hero, split-screen and sidebar shells. Run `pnpm exec vitest run --project browser test/conformance`
from this package.

Live value changes refresh constraint presentation for every array row. Submission
callbacks wait for the engine action lifecycle; an action failure with
`shouldContinue: false` or a rejected `onAction` callback suppresses submission
and runs the error and completion triggers. The instance finds its `rui-form`, the light-DOM
form its view authors, once when it connects and wires submission there.

## Agent skill

The package ships its part of the Schema Engine agent skill as `skill/reference/forms-radiant.md` and `skill/reference/forms-radiant-widgets.md`, which an agent reads from `node_modules/@schema-engine/forms-radiant/skill/reference/`. The router that routes a task to it is `skill/SKILL.md` of `@schema-engine/registry`. See [For AI agents](../../apps/docs/src/content/docs/schema-engine/agent-skill.mdx).
