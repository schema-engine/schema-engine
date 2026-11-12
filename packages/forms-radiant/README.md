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
pnpm add @schema-engine/forms-radiant @schema-engine/forms @ecopages/radiant-ui @ecopages/radiant @ecopages/jsx @ecopages/signals zod
```

The package targets Radiant `0.6.x` and Radiant UI `0.3.x`. Radiant `0.3.x`
is not supported: its server renderer escapes form markup twice, so hydrated
fields lose the validation rules serialized in the markup.

Load Tailwind preflight (via Radiant core), theme, and component styles:

```ts
import '@ecopages/radiant-ui/radiant-ui-core.css';
import '@ecopages/radiant-ui/themes/default';
import '@ecopages/radiant-ui/styles.css';
```

Apps should also import the emitted package stylesheet; published JS does not execute CSS:

```ts
import '@schema-engine/forms-radiant/index.css';
```

That file includes host display rules and first-party shell/field CSS. Apps that load component CSS without the package root still need the core (or their own Tailwind preflight) so headings, lists, and form controls are not left on user-agent margins.

First-party schemas use the functional `zod/mini` API. Install the `zod` package when authoring schemas; registrations supplied by consumers may use any Standard Schema implementation, including Valibot, Effect Schema, or Zod.

## Quick start

```ts
import { createRadiantFormEngine, FormRenderer, schemaFormRegistrations } from '@schema-engine/forms-radiant';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

<FormRenderer engine={engine} config={formConfig} onSubmit={handleSubmit} />;
```

`engine` is a live JavaScript value. `se-form-renderer` publishes it to descendant hosts through `formEngineContext`.

A host resolves its engine from an explicit `engine`, then the nearest `se-form-renderer` context, then the render in progress, and follows the renderer's context when an engine arrives or changes later. A host that no engine reaches stays quiet and renders nothing until one does. There is no module-level default, however many engines have been created.

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

- Each field serializes engine validation rules in `data-se-validation-rules`, including the rules a registration attaches by default (`defaultFor`): `FormField` takes the element config as `validation` and derives both its live rules and the serialized rules from that one merged list. Its former `rules` and `validationRules` props are removed: replace `rules={toFieldRules(config)} validationRules={config.rules}` with `validation={config}`, and move a hand-written `validate` from a `FieldRules` object to the `validate` prop, which runs after the derived rules. `validate` is client-only: a function cannot be serialized, so a server-rendered field gets it only when it renders on the client. `se-field` rebuilds its rules with the owning engine registry on connection and reconnection, so a hydrated field has its cross-field validators from its first connect. Native Radiant rules cover required, length, numeric bounds, and patterns; the registry validates the remaining rules, including cross-field and async rules. The legacy `reviveRules` export and `data-se-field-rules` channel have been removed.
- The engine of a server-rendered form is not serialized, so the app binds it explicitly by assigning `engine`, a `@prop`, to each `se-form-renderer`, before or after the renderer upgrades: a value assigned to an element before it is defined is adopted when it upgrades. `se-form-instance`, `se-form-array` and `se-field` take the engine from their own `engine`, then the renderer's context, then the render in progress, and subscribe to that context, so an engine bound or replaced on a connected renderer reaches them. An `engine` assigned to an instance directly wins over the renderer's. A field rebuilds its hydrated rules with the new engine's validators. A client router that swaps in a parsed page binds the engine to the incoming renderers before the swap; see the docs' [engine binding](../../apps/docs/src/content/docs/forms-radiant/getting-started.mdx). Hosts must find the renderer's context when they connect, so `se-form-renderer` is defined before the hosts below it, which the package's module order guarantees. A client render through `FormRenderer` passes the engine itself. There is no module-level engine and no fallback to the only engine created.
- `se-form-instance` owns submit callbacks in client renders and after hydration. Callbacks receive the nested value tree; attach or remove `instance.onSubmit` to switch between a callback and Radiant UI native submission configured with `action` or `method`.
- `se-form-instance` also owns the submitting state. Radiant UI clears its own `isSubmitting` before it awaits `onSubmit`, so the instance sets `isSubmitting` on `formInstanceContext` for the whole submission (actions and callback), and the submit buttons of `se-form-actions` and `se-wizard-actions` show their `submitting` label and disable while it is set. Every submission reports `se-action-submit-start` and `se-action-submit-complete` (`detail.succeeded`, `detail.results`, and `detail.error` when `onSubmit` or the action lifecycle threw) on the `rui-form`, with or without configured actions; a rejected `onSubmit` is logged and completes unsuccessfully. `se-submission-alert` follows those two events and `rui-invalid`, so it shows `pending` only while a submission runs and `success` only after it settles.
- Provider `onChange` receives nested value snapshots through `FormController.watchForm`; successful submission actions call `onAction` with their normalized action and the same nested values. Submission actions read a fresh form snapshot for each lifecycle trigger, and retain one form operations object so step timing resets on navigation. The instance uses the engine step navigator, field validation, and submission lifecycle; wizard navigation dispatches `step_leave`, `step_change` and `step_enter` through the instance's `FormActions` and ignores a step request while another navigation, including its step triggers, is in flight. Every trigger dispatches the form's actions and then the current step's (`collectStepActions`); the instance builds its `FormActions` when the form or any step configures an action, for its engine, and rebuilds them only when the engine changes: a new but equal config, as `FormProvider` produces on each render, keeps them, so `form_mount` does not fire again. An engine change also reconnects the validation dependency watcher and republishes `isWizard`. There is no action element to place or look up, and `se-form-renderer` has no `onSubmit`: pass the callback to the renderer's `FormRenderer` view or set `se-form-instance.onSubmit`. A config change or reconnection resets the step state and cancels the navigation in flight, so it neither writes its step state nor dispatches a step trigger after the reset. Disconnecting the instance cancels it too.
- `form_mount` actions run once for each engine attached to a live form, including when the engine changes after connection. `form_change` actions keep running after the instance reconnects.
- Action handlers read `context.errors` nested like the values (`errors.address.street`), as in React. `userInteractions` counts touched fields plus `submitCount`, which counts submit attempts since the last reset, failed ones included, as React does: Radiant UI records only whether the form was submitted, so the instance counts its form's `rui-invalid` events and its finished submission lifecycles. Radiant UI marks every registered field touched on submit, while React Hook Form does not, so the touched share can still differ. Action lists support parallel groups as described in the [actions guide](../forms/src/actions/README.md). The bubbling `se-action-results` event carries `detail.trigger` and nonempty `detail.results` for each trigger, including action identifiers, positions, outcomes, errors and data. The `se-action-submit-complete` event also includes the full submission results.
- The full normalized config is serialized once on `se-form-instance`. Recipe chrome receives one small `FormMeta` with form and step titles, descriptions, and ids; the same `FormMeta` is published on `formInstanceContext`, which is where the debugger reads it.
- Every step's fields are authored once inside `se-form-step`; hosts bind their own `hidden` attribute to the instance's step state (the view writes it only for the server markup; from connect on the step owns it and follows every value the instance publishes, so a wizard that becomes a non-wizard shows its steps), so SSR emits the full form and step switching is pure DOM. A native submit (Enter in a text input) before the last step of a wizard is intercepted by `se-form-instance` and goes to the next step, whatever the number of fields.
- Server-rendered constraints use the nested authored and caller defaults. Each field shares one constraint snapshot between its visibility wrapper and registered renderer. Live updates preserve an authored `disabled: true`, including when an `enable` constraint matches. A field's `disabled` and `required` compose its own authored state with every constraint wrapper around it, so a child of a constrained fieldset keeps its own `disabled`; a fieldset disabled by authoring or by a constraint renders its children disabled, and one required by a matching `require` constraint renders them with their required marker, and the constraint hosts keep them so. An array passes both to its rows the same way: a disabled array, authored or by a constraint, renders its rows and its add and remove buttons disabled, and an authored `disabled` array's rows stay disabled while its constraints change. Use `evaluateConstraints({ constraints, values, fieldPath, baseRequired })` from `@schema-engine/forms/constraints`; the Radiant `evaluateConstraintLogic` hook has been removed.
- Conditional fields with constraints are wrapped in an `se-constraint` host (class `.se-form-constraint`) that carries its rendered path as `data-se-constraint-field` (the path the server snapshot was evaluated with; an element without a name uses its enclosing array row or object, so its sibling references resolve there), its constraints as the JSON attribute `data-se-constraints` and `data-se-base-required` when the element's own rules require it. `se-form-instance` provides the live value tree and the authored-`disabled` lookup through `formValuesContext`, and the host reads them with `@onContextUpdate`. It evaluates only when a value its constraints read changes, writes the native `hidden` property (the view passes the same plain `hidden` attribute on the server), and provides `constraintContext` (`disabled`, `required`) composed with the wrappers around it, so a nested wrapper and every `se-field` inside read one nearest provider. A wrapper asks its parent for the context it composes with, because a request from the host itself would be answered by its own provider. Nothing sweeps the form on a store notification, and each row of an array resolves its own siblings through its rendered path. Until the instance publishes values the host keeps the snapshot it was rendered with, on the server and when it hydrates. `se-field` composes its authored `disabled` and rules with that context (rules set on the field from outside, as a re-render does, become its new authored baseline): a `require` updates the live `FieldRules` object (so `validate` functions and `RegExp` patterns survive), toggles `[data-se-required-marker]` on the label, and validates the field when it was touched or the form was submitted. A field with no `se-constraint` around it gets no live constraint handling.
- Every `se-*` host declares its public props with `JSX_PROPS`, and the views render the host class (`<FormStepElement stepIndex={i} />`), so a misspelled or dead prop is a compile error; internal `@state` is `protected`. A `se-split-screen-side` without `meta` renders its children.
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
element: `lib/authored-disabled.ts`, `lib/validate-current-step.ts` and
`lib/validation-deps.ts` are the existing examples.

## Grid layout

Responsive grid layout is **pure CSS**. The engine owns the grid vocabulary —
breakpoint thresholds, gap tokens, and the default minimum column width — via
`createRadiantFormEngine({ grid: { breakpoints, gap, minColumnWidth } })`;
forms describe their layout with `columns`, `gap`/`gapX`/`gapY`
(`none | compact | default | loose | wide` or a CSS value), `responsive`
entries per breakpoint, and per-field `grid.column`/`grid.row` placement with
per-breakpoint `hidden` overrides.

The renderer emits the generated theme stylesheet (scoped to
`data-se-grid-theme`) and the form's CSS variables inline during render, so
SSR output is styled with no FOUC and hydration is not required for layout.
Media queries follow the viewport width. Sparse responsive entries inherit
from the preceding breakpoint, then the top-level value; `gapX`/`gapY` beat an
entry's `gap`. Only authored values are emitted inline — the generated
stylesheet supplies the defaults, chains each breakpoint back through the
narrower ones, and resets the variables at every host so nested grids stay
isolated. Breakpoint thresholds on the engine must keep named order
(`sm ≤ md ≤ lg ≤ xl ≤ 2xl`); `rem`/`em` compare at a 16px root.

## MVP elements

- input, textarea, number, select, checkbox, switch, radio, submit-button

Fields and array components share Radiant UI's form store through
`FormController`. Use it with explicit `connect` / `disconnect` lifecycle methods
or the optional `@formController` decorator. `FormFieldElement` extends
`RuiFieldElement` with no form access of its own (construct a `FormController` on
it when needed); Radiant UI retains control
registration, validation, and error presentation. Custom async validators keep
debounce state in the field's validator closure, so one field instance cannot
cancel another field's pending request. When a later validation of the same
field supersedes an earlier one, the earlier call resolves with the later
result, so a debounced async check superseded by the next keystroke never shows
`Validation pending`, and a submit-time check waits for the check of the latest
value. `config.validationMode` and `config.reValidateMode` set the `rui-form`
`mode` and `reValidateMode`; unset, fields validate on submit and re-validate on
change.

The controller provides snapshot reads, live watches with cleanup, field bindings,
and array mutations with stable row IDs. See the [controller API and migration
guide](./src/adapters/radiant/controller/README.md) for examples and the replacement
for the removed snapshot hooks.

`arrayElements` registers the array name as a field. A `minItems` rule in
`rules` checks the row count at submission. The `minItems` config property seeds
the initial row count, and the built-in Remove control keeps that count as its
floor. `maxItems` caps the built-in Add control. `initialValues` is merged over
child `defaultValue`s for rows created by Add or to meet the `minItems` floor.
Rows supplied through form `defaultValues` are included in server markup with
deterministic IDs. During hydration, the connected array host retains those row
nodes even when the array view has no JSX binding markers of its own. The array host reads its engine from the renderer's context and registers with the form once it has one. Its error is a controlled `RuiFieldError`; the array fieldset's `aria-describedby` points at it while it shows a message. Direct
`FormController.fieldArray` mutations do not apply the
array config's Add and Remove behavior.

`masked-input`, `phone-input` and `input-otp` are form-associated custom elements
registered with Radiant UI's `registerFieldControl`. Each exposes its value as
`value`, and a form reset or `FormController.setValue` repaints it. Each host
declares its ARIA target with `fieldControlHostAttributes` and paints the
field's `id`, label and ARIA onto it declaratively: it reads `fieldContext` with
`@contextSelector` into a field decorated with
`@bindTo(fieldAriaBindings(selector))` from `@ecopages/radiant-ui/field`, so the
field writes nothing on the host and observes no mutations. The hosts do not
spread `fieldAria(field)` in `render()`: an attribute that appears on a rendered
element, such as `aria-describedby` when an error shows, makes Radiant replace the
element, which drops its focus and detaches the mask. They submit through native `FormData`
and fire a bubbling `rui-change`. The OTP keeps one entry per slot, so a
character stays in its slot; its value is the slots joined, and an incomplete
code is a shorter string. The `input-otp` field schema adds a default `pattern` rule that accepts an empty code or one with every slot filled and reports "Enter all N characters" (or the config's `incompleteMessage`) otherwise, unless the author wrote a `minLength`, `maxLength` or `pattern` rule, so `validateForm` output and headless `validateFormValues` carry it too. `drop-zone` is registered
with its file input as the submitted control, and its host exposes the accepted
files as `files`.

The forms-radiant input views take no element-level `onChange`, `onBlur` or
`onFocus`: observe values with `FormController.watchField` or the `rui-change`
event.

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

Stories default to **client** render. Use the Storybook toolbar **Radiant render** control to spot-check `ssr-hydrate` and `ssr-static` on any story — same contract as radiant-ui. Play functions skip `ssr-static` (markup-only iframe, no client module). SSR layout acceptance renders the real `RecipeRenderer` through `renderToString`: `test/ssr/grid-layout-ssr.markup.test.ts` checks the emitted stylesheet and field variables, and `test/ssr/grid-layout-ssr.acceptance.browser.test.ts` loads that HTML in an isolated iframe without app JS and checks layout at two widths. Both share `test-utils/` with the React package.

Published JavaScript files are marked as side effects so bundlers preserve
custom element registration for every entry point. Supported Radiant peers are
`>=0.4.0 <0.5.0` (JSX and Radiant) and `>=0.2.1 <0.3.0` (Radiant UI).

### Custom recipe migration

Custom shell props and slot factory contexts now receive `meta` in place of
`config`. Import `FormMeta` from `@schema-engine/forms-radiant` when annotating
these inputs. Replace chrome reads such as `context.config.steps` with
`context.meta.steps`. Metadata includes form and step ids, titles, and descriptions;
it omits elements, rules, defaults, and actions. Keep field rendering in the
recipe content supplied by the renderer.

### Engine-scoped config types

Element, recipe, and action config types come from the registrations passed to
each engine. Use `engine.defineForm` to infer authoring inputs and normalized
outputs for that engine. Radiant renderer props accept `FormEngineRuntime`, which
omits registration extension. Registration files no longer augment a global
`FormEngine` namespace.

### Shared renderer conformance

The browser project also mounts `FormRenderer` for the shared
[`renderer conformance scenarios`](../../test-utils/renderer-conformance.ts):
array sibling constraints, the state that follows scalar array rows, nested wizard
validation, required constraints on fields and containers, disabled arrays,
`validationMode`, nested error clearing, Valibot action registration, submission
aborts, submit attempt counts, and change and action callbacks. Run `pnpm exec vitest run --project browser test/conformance`
from this package.

Live value changes refresh constraint presentation for every array row. Submission
callbacks wait for the engine action lifecycle; an action failure with
`shouldContinue: false` or a rejected `onAction` callback suppresses submission
and runs the error and completion triggers. The instance finds its `rui-form`, the light-DOM
form its view authors, once when it connects and wires submission there.
