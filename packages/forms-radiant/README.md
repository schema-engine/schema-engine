# @schema-engine/forms-radiant

Radiant/JSX adapter for the Schema Engine form system.

## Logging

Runtime diagnostics go through `@ecopages/logger` with the
`[schema-engine/forms-radiant]` package tag. Debug output is disabled by default;
warnings and errors keep their severity and diagnostic details.

A connected host that no engine reaches logs one warning for that host. This includes a host under a `se-form-renderer` that was never given an engine. Detached hosts stay quiet.

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

A host resolves its engine from an explicit `engine`, then the nearest `se-form-renderer` context, then the render in progress. There is no module-level default, however many engines have been created.

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
- The engine of a server-rendered form is not serialized, so the app binds it explicitly: assign `engine` to each `se-form-renderer` before it upgrades (while it is detached from its document, or before the element is defined), and the renderer adopts it when it upgrades. `se-form-instance` and `se-field` resolve the engine once, at connect, from their own `engine`, then the renderer's context, then the render in progress. They never wait for a later one: a host that finds none logs a configuration error, including a host under a renderer that was never given an engine. Replacing the engine of a connected `se-form-renderer` logs one warning and does not reach hosts that already resolved: bind the engine before connect. A client render through `FormRenderer` passes the engine itself. There is no module-level engine and no fallback to the only engine created.
- `se-form-instance` owns submit callbacks in client renders and after hydration. Callbacks receive the nested value tree; attach or remove `instance.onSubmit` to switch between a callback and Radiant UI native submission configured with `action` or `method`.
- `se-form-instance` also owns the submitting state. Radiant UI clears its own `isSubmitting` before it awaits `onSubmit`, so the instance sets `isSubmitting` on `formInstanceContext` for the whole submission (actions and callback), and the submit buttons of `se-form-actions` and `se-wizard-actions` show their `submitting` label and disable while it is set. Every submission reports `se-action-submit-start` and `se-action-submit-complete` (`detail.succeeded`, `detail.results`, and `detail.error` when `onSubmit` or the action lifecycle threw) on the `rui-form`, with or without configured actions; a rejected `onSubmit` is logged and completes unsuccessfully. `se-submission-alert` follows those two events and `rui-invalid`, so it shows `pending` only while a submission runs and `success` only after it settles.
- Provider `onChange` receives nested value snapshots through `FormController.watchForm`; successful submission actions call `onAction` with their normalized action and the same nested values. Submission actions read a fresh form snapshot for each lifecycle trigger, and retain one form operations object so step timing resets on navigation. The instance uses the engine step navigator, field validation, and submission lifecycle; wizard navigation dispatches `step_leave`, `step_change` and `step_enter` through the instance's `FormActions` and ignores a step request while another navigation, including its step triggers, is in flight. Every trigger dispatches the form's actions and then the current step's (`collectStepActions`); the instance builds its `FormActions` when the form or any step configures an action, for its engine, and rebuilds them only when the engine changes: a new but equal config, as `FormProvider` produces on each render, keeps them, so `form_mount` does not fire again. An engine change also reconnects the validation dependency watcher and republishes `isWizard`. There is no action element to place or look up, and `se-form-renderer` has no `onSubmit`: pass the callback to the renderer's `FormRenderer` view or set `se-form-instance.onSubmit`. A config change or reconnection resets the step state and cancels the navigation in flight, so it neither writes its step state nor dispatches a step trigger after the reset. Disconnecting the instance cancels it too.
- `form_mount` actions run once for each engine attached to a live form, including when the engine changes after connection. `form_change` actions keep running after the instance reconnects.
- Action handlers read `context.errors` nested like the values (`errors.address.street`), as in React. `userInteractions` counts touched fields plus `submitCount`, which counts submit attempts since the last reset, failed ones included, as React does: Radiant UI records only whether the form was submitted, so the instance counts its form's `rui-invalid` events and its finished submission lifecycles. Radiant UI marks every registered field touched on submit, while React Hook Form does not, so the touched share can still differ. Action lists support parallel groups as described in the [actions guide](../forms/src/actions/README.md). The bubbling `se-action-results` event carries `detail.trigger` and nonempty `detail.results` for each trigger, including action identifiers, positions, outcomes, errors and data. The `se-action-submit-complete` event also includes the full submission results.
- The full normalized config is serialized once on `se-form-instance`. Recipe chrome receives one small `FormMeta` with form and step titles, descriptions, and ids; the debugger reads its owning instance.
- Every step's fields are authored once inside `se-form-step`; hosts toggle their own `hidden` attribute from the step state, so SSR emits the full form and step switching is pure DOM.
- Server-rendered constraints use the nested authored and caller defaults. Each field shares one constraint snapshot between its visibility wrapper and registered renderer. Live updates preserve an authored `disabled: true`, including when an `enable` constraint matches. A field's `disabled` and `required` compose its own authored state with every constraint wrapper around it, so a child of a constrained fieldset keeps its own `disabled`; a fieldset disabled by authoring or by a constraint renders its children disabled, and one required by a matching `require` constraint renders them with their required marker, and live sync keeps them so. An array passes both to its rows the same way: a disabled array, authored or by a constraint, renders its rows and its add and remove buttons disabled, and live sync keeps an authored `disabled` array's rows disabled. Use `evaluateConstraints({ constraints, values, fieldPath, baseRequired })` from `@schema-engine/forms/constraints`; the Radiant `evaluateConstraintLogic` hook has been removed.
- Conditional fields with constraints are wrapped in a plain `.se-form-constraint` container with `data-se-constraint-field`. `se-form-instance` listens to the form store and toggles `hidden` and the field's `disabled` reactively, without separate custom element wrappers or serialized JSON configs. It reads the rendered `data-se-constraint-field` values rather than building selectors from the config, so each row of an array resolves its own siblings. Constraint `require` updates the live `FieldRules` object (so `validate` functions and `RegExp` patterns survive) and toggles `[data-se-required-marker]` on the label.
- Recipe chrome blocks read serializable `meta` / `slotConfig` props (the block's own slot config, not the whole view) plus the live `formInstanceContext`; where SSR cannot resolve context (authored children serialize before providers publish), they fall back to the initial step-0 state and hydrate the live values.
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
export { FormInstanceElement } from './form-instance.script';

export function FormInstance({ config, … }) {
	return jsx('se-form-instance', { config, children: … });
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
element: `lib/constraint-elements.ts`, `lib/validate-current-step.ts` and
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
`RuiFieldElement` and exposes scoped form access; Radiant UI retains control
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
nodes even when the array view has no JSX binding markers of its own. Replacing
the renderer's engine updates the array's field rendering. Direct
`FormController.fieldArray` mutations do not apply the
array config's Add and Remove behavior.

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
