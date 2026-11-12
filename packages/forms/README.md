# @schema-engine/forms

Framework-agnostic form configuration, validation, actions, and view-recipe
registration for Schema Engine.

First-party schemas are authored with Zod Mini's functional API and imported
from `zod/mini`. Install the `zod` package when using the built-in schemas. The
registration contracts remain `StandardSchemaV1`, so custom elements, recipes,
and actions can use Valibot, Effect Schema, Zod, or another compatible
provider.

## Logging

Runtime diagnostics go through `@ecopages/logger` with the
`[schema-engine/forms]` package tag. Debug output is disabled by default;
warnings and errors keep their severity and diagnostic details.

## Compose an engine

```ts
import { createFormEngine } from '@schema-engine/forms';

const engine = createFormEngine({
	elements: [textInputRegistration],
	recipes: [cardRecipe],
	actions: [submitActionRegistration],
});
```

`createFormEngine` registers elements, recipes, and actions in one declarative
call. A recipe is the single view protocol: it declares the recipe kind,
shell/slot keys, validation schema, metadata, and framework adapter payload.
Forms select one recipe with `view.$type`. `@schema-engine/forms/recipes` is the protocol (`defineRecipeSpec`, the renderer-neutral `defineFormRecipe`, the view model; adapters wrap it as `defineRecipe` to type the render payload against the spec's slots); `@schema-engine/forms/recipes/built-in` holds the nine built-in specs (moved off `/recipes`), their slot schemas and config types. `defineRecipeSpec` keeps the concrete view schema type, so `defineForm` types each declared slot's config and rejects slot keys the recipe does not declare. `slotDefaults` are typed against the slot schemas and parsed when the spec is defined. `createFormEngine` enforces the kind rules (single-step recipes declare no `progress` slot, wizard recipes declare `actions`) for every registration.

```ts
const contactForm = engine.defineForm({
	id: 'contact',
	title: 'Contact',
	view: { $type: 'card' },
	steps: [
		{
			id: 'details',
			title: 'Details',
			elements: [{ $type: 'input', id: 'email', name: 'email' }],
		},
	],
});
```

`defineForm` is the typed authoring API for that engine's registrations. `validateForm(input: unknown)` validates external JSON. Both run the same pipeline: envelope parse, Standard Schema dispatch by `$type` (including nested child elements), recipe-kind checks, and schema defaults/transforms. The normalized marker is applied only after that succeeds. `defineForm` and `validateForm` return a frozen `NormalizedFormConfig` owned by that engine. Snapshot isolation copies plain objects and arrays, so caller data of those kinds is not frozen. Other objects currently remain shared. A normalized form cannot be reused on another engine; pass the original authoring input or JSON instead. Renderers consume that normalized output. They do not re-run registration input schemas. Standalone or dynamically created fields that are not already inside a form must go through `engine.validateElement()` first. Containers render children with `FormElements` and a field scope (`namePrefix`, `instanceId`); they do not clone normalized configs to change paths.

### Shared step and submission logic

`createInitialStepStates(totalSteps)` creates completion, validity, and visitation arrays;
the first step starts visited. `createStepMachine(config)` returns a reducer for `next`,
`previous`, and `go-to` actions. A `next` action receives the caller-supplied `isValid`
value; the reducer does not validate fields. When it is true on a non-final step, the
reducer completes the active step and advances. On the final step, it updates validity
without marking that step complete or advancing. When `isValid` is false, it leaves the
active step in place. Pass the resulting state to `buildViewModel` as `stepStates`.

`createStepNavigator({ reduce, getState, setState, validateStep, dispatchTrigger })` wraps
that reducer in the navigation both renderers share. It returns `{ navigate, cancel }`.
`navigate(action)` takes `{ type: 'next' }` without `isValid`, `{ type: 'previous' }` or
`{ type: 'go-to', index }`. `next` awaits `validateStep` for the
active step before reducing. A request made while another is in flight resolves without doing anything, so a
double click on Next advances one step. When the step index changes, `step_leave` runs
before the new state is set and `step_change` then `step_enter` run after it. Call
`cancel()` when you reset the step state: the navigation in flight then writes no state
and dispatches no further trigger, and the next request is accepted without waiting for it.

`collectStepActions(config, stepIndex)` lists the actions a trigger dispatches while that
step is current: the form's `actions`, then the step's own. `hasConfiguredActions(config)`
reports whether the form or any step configures one. Steps no longer accept
`onStepEnter`, `onStepLeave` or `onStepValidate`; those hooks never ran. Move an enter or
leave hook into the step's `actions` with `triggers: ['step_enter']` or `['step_leave']`;
`onStepValidate` has no replacement. A JSON config that still sets them has the keys stripped.

Action lists may contain inner arrays for parallel groups; see the [actions guide](./src/actions/README.md). `runSubmissionLifecycle(dispatch, { actions, context })` dispatches the form submit start,
submit, success or error, and complete triggers. Pass a fixed `context` when every trigger
uses the same snapshot, or a context factory when each trigger needs a fresh form-state
snapshot. Pass `onAction(action, data)` to run a callback after each successful submit
action. If it rejects, that action becomes a fatal failure and later submit actions stop.
The returned `succeeded` flag is false when a submit action fails with
`shouldContinue: false` or `onAction` rejects; a failed action that allows continuation
does not fail the submission. Each returned result carries the `actionId` of the
configured action that produced it.
`buildFormActionContext` is an exported utility that constructs a form action
context with form data and timing metadata, including a stable step start time that resets
when the active step changes. Its form state takes `errors` and `touched` nested like the
values, so a handler reads `context.errors.address.street` in every renderer, and
`userInteractions` counts touched fields plus `submitCount`, the submit attempts since the last reset, failed ones included.
The form state no longer accepts `touchedFields` or `isSubmitted`: pass `touched` and
`submitCount`, both required (see [action context form state](src/engine/README.md#action-context-form-state)).
The engine entry point also re-exports `ActionDispatcher` so
both renderers can use the same action dispatcher class.

An `arrayElements` row with one leaf child uses a scalar path when its seed is not object-shaped. A child container such as `fieldSet` stays under its own row object path. Object-shaped array `initialValues`, a child field's object-shaped `defaultValue`, or the first row object from form `defaultValues` (falling back to the array's `defaultValue`) also selects the object path.
Use `engine.extend({ ... })` to add registrations without re-spreading shared barrels. A `catalog` passed to `createFormEngine` or `extend` is a copied base: every registration writes its own entry over it, and `extend` rebuilds from the source engine's catalog, or from its own `catalog` when one is passed, so custom entries carry over. Author forms with `engine.defineForm({ ... })` object literals.

Extra DOM attributes on the focusable control (for example `data-testid`) belong in `htmlAttributes` on the field config. Unknown top-level keys are stripped during validation; reserved control props cannot be authored inside the bag.

```ts
elements: [
	{
		$type: 'input',
		id: 'email',
		name: 'email',
		label: 'Email',
		htmlAttributes: { 'data-testid': 'email-field', enterKeyHint: 'next' },
	},
];
```

### Grid theme

The engine also owns the grid layout vocabulary through the optional `grid`
option: breakpoint thresholds (`sm`…`2xl`, CSS lengths), gap token definitions
(`none | compact | default | loose | wide`), and the default minimum column
width for `columns: 'auto'` grids. Gap tokens can change by breakpoint, so one
token carries a whole responsive rhythm and a form that selects it inherits that
rhythm without any `responsive` entry of its own:

```ts
createFormEngine({
	grid: {
		gap: { default: '1rem', loose: '1.5rem' },
		responsive: {
			md: { default: '1.25rem' },
			lg: { default: '1.5rem', loose: '2rem' },
		},
	},
});
```

`responsive` is breakpoint-major, matching a form's own `responsive`: each entry
lists the tokens that change at that width, and unlisted tokens keep the value
from the next narrower one. Base values stay in `gap`. Tokens are axis-agnostic —
a form chooses which token each axis uses through `gapX`/`gapY`, so a theme never
declares an axis. Overriding the public token (`--se-grid-gap-default`) from a
host replaces it at every width, ramp included — host declarations beat the
engine's by design.

An individual element can set its own rhythm with `grid.marginBlockStart` and
`grid.marginBlockEnd`, which accept the same gap tokens and are responsive per
breakpoint like the rest of `grid`:

```ts
{ $type: 'submission-alert', id: 'status', name: 'status',
  grid: { marginBlockEnd: 'wide', responsive: { lg: { marginBlockEnd: 'loose' } } } }
```

This applies to any element rendering a `.se-form-field` host with the engine's
theme id — not only inputs. Renderers expose a helper for elements that build
their own container (`useFieldHost` in React, `mergeFieldGridHost` in Radiant). Every engine exposes a frozen
`engine.getCompiledGrid()` (theme plus stylesheet), with `getGridTheme()` as a
convenience getter, computed once at construction (library defaults apply when
`grid` is omitted). Configured breakpoint
thresholds must preserve named cascade order (`sm ≤ md ≤ lg ≤ xl ≤ 2xl`);
`rem`/`em` lengths compare at a 16px root so mixed units cannot invert the
sequence. Forms consume those tokens in their `grid` configuration (`columns`,
`gap`/`gapX`/`gapY`, `responsive` entries, per-field `grid` placement).
Renderers emit the scoped stylesheet (`data-se-grid-theme`) inline during
render, so responsive layout is CSS-driven — no runtime observers, and SSR
output is styled before hydration. The stylesheet owns the neutral defaults,
the breakpoint cascade, and the resets that keep nested grids isolated; inline
styles carry only the values an author actually wrote, so an unconfigured field
emits none at all. Gap tokens stay host-overridable: the engine declares its
defaults privately and reads `var(--se-grid-gap-<token>, …)`, so a `:root`
override still wins. A field host that needs its own layout sets
`--se-field-display-mode` rather than `display`, because the generated field
rule outranks a bare class. `engine.extend()` inherits the source engine's grid theme;
`grid` is not an extend option.

Single-step forms may omit `view` to render fields directly. Multi-step forms
that omit `view` use the registered `bare-controls` recipe at **render** time.
`engine.validateForm` still succeeds if that recipe is missing; the renderer
warns and shows fields without chrome. `validateForm` does apply kind and slot
checks when `view.$type` is set.

## Engine validation

The forms package exports shared value-validation helpers from
`@schema-engine/forms`. `validateFormValues` accepts a `ValidationElementTree`,
and `collectStepFieldPaths` accepts a `ValidationStep`; both types follow the
engine's normalized form model.

- `collectStepFieldPaths(step, values)` walks named fields in nested containers
  and expands field templates for each array row. Scalar array child rules use
  item paths such as `tags.0`, while the array container keeps its `tags` path.
- `effectiveRulesFor({ element, fieldPath, values, registry })` combines
  configured and field-type default rules, then adds `required` when a `require`
  constraint holds for the rendered field path. A sibling reference such as
  `accountType` on `contacts.0.taxId` resolves to `contacts.0.accountType`, so
  each array row uses its own value.
- `validateFieldValue({ element, value, values, fieldPath, registry, debounceScope })` returns
  the first validation message, or `undefined` when the value passes.
- `validateFormValues({ elements, values, registry, names?, debounceScope })` validates the
  selected paths and returns nested errors, such as
  `errors.address.street.message`.

Both helpers require a caller-owned `DebounceScope`, which carries async debounce
state across validation calls for a form. Each rendered field path is keyed
separately, and each form should own its scope. A scope created per call would
delay debounced rules without coalescing them.

Required rules, `relate`, constraint emptiness operators, and async skip checks
share the same empty values: `undefined`, `null`, `''`, and `[]`. `false` and
`0` count as present. `validateForm` and `validateElement` reject rules without
a registered handler with a `FormValidationError` naming the field and rule.
The `relate` string and date bases coerce primitive values and `Date` instances;
arbitrary objects are left unchanged for string comparisons and are invalid dates.

Constraint `contains` and `not_contains` use text matching only for primitive
string, number, boolean, and bigint values. Object-valued fields do not fall back
to JavaScript's default object string.

The `values` argument is the full nested form value tree. Omitting `names`, or
passing an empty list, validates every named field. A non-empty `names` list
validates only the requested paths and their descendants.

React and Radiant use these shared validation helpers.

## Browser integrations

The `@schema-engine/forms` root entry point is framework-agnostic and does not
choose browser storage or analytics globals. Import browser tools and their
preconfigured action registrations from `@schema-engine/forms/browser`:

```ts
import {
	AutoSaveActionRegistration,
	GTMActionRegistration,
	GDPRConsent,
	ResetActionRegistration,
} from '@schema-engine/forms/browser';

GDPRConsent.grantConsent();
```

The browser auto-save registration writes only after consent has been granted.
It and the reset registration share the `autosave_<formId>` key, and revoking
consent clears drafts stored under that key or a custom auto-save `storageKey`.
Hosts using the root plugin factories provide their own `AutoSaveStorage`
adapter.

## Who owns visual chrome

| Layer                                                           | Owns                                                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `@schema-engine/forms`                                          | Engine, validation, actions, recipe protocol, adapter types (`@schema-engine/forms/adapters`) — no widget `$type` schemas |
| `@schema-engine/forms-react`                                    | React renderer components; adapter contracts at `/adapters`, optional RHF adapter at `/adapters/react-hook-form`          |
| `@schema-engine/forms-radiant`                                  | Radiant widgets, default-aware SSR constraints, shells, blocks, and scoped form controllers                               |
| Schema Engine shadcn registry (`schemaFormRegistrations`, etc.) | Copied React widgets, colocated field schemas, and view recipes for the React adapter                                     |

Custom fields use `defineInput` with any Standard Schema. Default widgets ship their own Zod schemas beside their registrations; those schemas are not engine contracts and may differ between React and Radiant.

### Engine-scoped config types

Element, recipe, and action config types come from each engine's registrations.
Use `engine.defineForm` to infer its authoring inputs and normalized outputs.
The `FormConfig` and `NormalizedFormConfig` types accept the same engine maps;
their defaults stay open for helpers without a concrete engine. Parsed output
maps remain separate from schema input maps, so defaults and transforms retain
their output types. Renderer props use `FormEngineRuntime`, which omits
registration extension.

### Container registration semantics

Set `containerKind: 'array'` on an array input registration, including custom
widgets with a different `$type`. The engine carries this metadata into frozen
normalized elements for default seeding and field traversal. Authoring JSON does
not include this marker. Containers without an array marker use object paths.
See [engine internals](src/engine/README.md#schema-artifacts-and-extension).

`templatePath` in `@schema-engine/forms/lib/path-values` removes numeric array indices from rendered paths for constraint declaration lookup, alongside `expandFieldTemplatePaths`.

Engine construction builds registration Maps directly and validates each supplied
schema once at that boundary. Form action results add optional browser redirects
to the generic result; see [actions](./src/actions/README.md).

## Pre-publish API

Use `FormActionTrigger` and `BuilderActionRuntimeContext` for form actions. The
`@schema-engine/forms/actions` entry exports `ActionDispatcher` for renderers.
Recipe lookup accepts an engine or `{ getRecipe }` object. Grid configuration
rejects unknown keys, including `rows`, `autoFit`, `autoFill`, and
`maxColumnWidth`; automatic columns use `columns: 'auto'` and `minColumnWidth`.
Recipe metadata has no `deprecated` property.

React uses the engine's validation, step state, submission triggers and action
context builder; see the [React adapter contract](../forms-react/README.md#validation-navigation-and-action-contexts).
Action context form adapters must implement `reset`, `setValue`, `getValue` and
`validate`, including for custom renderer integrations.

The validation dependency index also tracks `require` constraints, so renderers
can clear conditional required errors when a controlling value changes.
