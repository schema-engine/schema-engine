# @schema-engine/forms

Framework-agnostic form configuration, validation, actions, and view-recipe
registration for Schema Engine.

First-party schemas are authored with Zod Mini's functional API and imported
from `zod/mini`. Install the `zod` package when using the built-in schemas. The
registration contracts remain `StandardSchemaV1`, so custom elements, recipes,
and actions can use Valibot, Effect Schema, Zod, or another compatible
provider.

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
Forms select one recipe with `view.$type`.

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

`runSubmissionLifecycle(dispatch, { actions, context })` dispatches the form submit start,
submit, success or error, and complete triggers. The returned `succeeded` flag is false
only when a submit action fails with `shouldContinue: false`; a failed action that allows
continuation does not fail the submission. `buildFormActionContext` is an exported utility
that constructs a form action context with form data and timing metadata, including a
stable step start time that resets when the active step changes. The engine entry point also
re-exports `ActionDispatcher` so both renderers can use the same action dispatcher class.

An `arrayElements` row with one leaf child uses a scalar path when its seed is not object-shaped. A child container such as `fieldSet` stays under its own row object path. Object-shaped array `initialValues`, a child field's object-shaped `defaultValue`, or the first row object from form `defaultValues` (falling back to the array's `defaultValue`) also selects the object path.
Use `engine.extend({ ... })` to add registrations without re-spreading shared barrels. Author forms with `engine.defineForm({ ... })` object literals.

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
  and expands field templates for each array row.
- `effectiveRulesFor({ element, fieldPath, values, registry })` combines
  configured and field-type default rules, then adds `required` when a `require`
  constraint holds for the rendered field path. A sibling reference such as
  `accountType` on `contacts.0.taxId` resolves to `contacts.0.accountType`, so
  each array row uses its own value.
- `validateFieldValue({ element, value, values, fieldPath, registry })` returns
  the first validation message, or `undefined` when the value passes.
- `validateFormValues({ elements, values, registry, names? })` validates the
  selected paths and returns nested errors, such as
  `errors.address.street.message`.

The `values` argument is the full nested form value tree. Omitting `names`, or
passing an empty list, validates every named field. A non-empty `names` list
validates only the requested paths and their descendants.

The current React and Radiant renderers still have their own validation paths;
adoption of these shared helpers is tracked by [#138](https://github.com/andeeplus/schema-engine/issues/138)
and [#133](https://github.com/andeeplus/schema-engine/issues/133), respectively.

## Who owns visual chrome

| Layer                                                           | Owns                                                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `@schema-engine/forms`                                          | Engine, validation, actions, recipe protocol, adapter types (`@schema-engine/forms/adapters`) — no widget `$type` schemas |
| `@schema-engine/forms-react`                                    | React renderer, RHF adapter, field-array operations, and headless `createFormEngine()` re-export                          |
| `@schema-engine/forms-radiant`                                  | Radiant widgets, colocated field schemas, shells, blocks, and scoped form controllers                                     |
| Schema Engine shadcn registry (`schemaFormRegistrations`, etc.) | Copied React widgets, colocated field schemas, and view recipes for the React adapter                                     |

Custom fields use `defineInput` with any Standard Schema. Default widgets ship their own Zod schemas beside their registrations; those schemas are not engine contracts and may differ between React and Radiant.
