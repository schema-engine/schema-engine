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
	validations: [postcodeRule],
});
```

`createFormEngine` registers elements, recipes, actions and custom validation
rules in one declarative call. A recipe is the single view protocol: it declares the recipe kind,
shell/slot keys, validation schema, metadata, and framework adapter payload.
Forms select one recipe with `view.$type`. `@schema-engine/forms/recipes` is the forms protocol: `formRecipeProtocol` declares the slots (`shell`, `header`, `progress`, `actions`), the kinds (`single-step`, `wizard`) and the kind rules on top of the domain-neutral recipe machinery in [`@schema-engine/layout`](../layout/README.md#recipe-protocol) (`formRecipeProtocol.slots` is the slot order). `defineRecipeSpec`, the renderer-neutral `defineFormRecipe` and the view model are typed by it (adapters wrap `defineFormRecipe` as `defineRecipe` to type the render payload against the spec's slots); `@schema-engine/forms/recipes/built-in` holds the nine built-in specs (moved off `/recipes`), their slot schemas and config types. `defineRecipeSpec` keeps the concrete view schema type, so `defineForm` types each declared slot's config and rejects slot keys the recipe does not declare. `slotDefaults` are typed against the slot schemas and validated when the spec is defined. Each slot schema owns its defaults (including default labels), and each declared slot defaults to `{}` in the view schema, so the normalized `view` is complete and the view JSON Schema shows every default. `getSlotConfig(viewConfig, slot, schema)` returns `z.output<schema>`. The wizard `actions` slot's `showStepCounter` defaults to `true` regardless of `variant`. `createFormEngine` runs the protocol's kind rules (single-step recipes declare no `progress` slot, wizard recipes declare `actions`) on every winning registration, and an error names the recipe and the rule. In `split-screen-wizard` the side panel shows the form title and the header shows the step title (`header.fallbackToFormTitle` defaults to `false` there, `true` elsewhere); a single-step `split-screen` keeps its panel title.

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

### Validation errors

`validateForm` throws a `FormValidationError` for a form that does not validate. Its `issues` list the
problems found, each shaped like a Standard Schema issue: `{ message, path }`. `path` is the config key the
issue is about, in object keys and array indexes, so a caller can find it without parsing the message.
A nested element carries its whole path, and an issue about the form itself has the path `[]`:

| Problem                                          | `path`                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| A field's `grid.width` is not a named width      | `['steps', 0, 'elements', 2, 'grid', 'width']`                   |
| A child of a fieldset has a rule with no handler | `['steps', 0, 'elements', 1, 'elements', 0, 'rules', 0, 'type']` |
| `view.$type` is not a registered recipe          | `['view', '$type']`                                              |
| An element's `appearance` picks an unknown value | `['steps', 0, 'elements', 0, 'appearance', 'size']`              |
| A step grid's `areas` is not a valid template    | `['steps', 0, 'grid', 'areas']`                                  |

A schema issue keeps the path the schema gave it, laid under the location of the element, action or view
it validated. A check the engine makes (the view, recipe kind, grid, areas, appearance picks and rules)
points at the key it rejects, always a key the author wrote: a field whose `area` resolves through the
breakpoint cascade is reported at the `area` it set, and the message says where a viewport lands.
`validateElement` reports paths relative to the element. A malformed form envelope (its own shape, such as
`steps` not being an array) stops the deeper checks and is reported alone; once it parses, the element,
action, grid and view issues come together.

An unrecognized key is reported at the key (`['view', 'shell', 'bogus']`), as the engine does for a view.
`zod/mini` loads no locale, so its own messages are all `Invalid input`; the engine rewrites that fallback
from what the issue reports (`Expected one of half, third, ...`, `Must be at least 3 characters.`,
`Invalid email format.`) because these are author diagnostics, not copy shown to a form's users. A message a
schema or its author wrote is kept, and a host that wants Zod's own wording loads a locale once with
`z.config(z.locales.en())`, after which its messages pass through untouched. That reaches the engine's own
schemas only when the host shares forms' Zod instance; schemas the host builds for its registrations always get it.

`error.message` lists the issues one per line as `<path>: <message>`, with array indexes in brackets and the
`id` of each element, step or action the path passes
(`steps[0] (main).elements[2] (email).grid.width: Expected one of full, three-quarters, ...`), and the bare
message for an issue about the whole form. The ids only decorate the message; `issue.path` and
`issue.message` stay clean. An issue a schema reported also carries `code` and `params` (Zod's code and its
details, such as `too_small` and `{ minimum: 3 }`) for an editor that localizes diagnostics; a failed union is
reported at the key that failed in the closest branch. `formatIssuePath(path, source?)` makes the same text, with the ids when you
pass the config. `FormValidationIssue` and `FormValidationResult` are exported.

`engine.safeValidateForm(config)` runs the same validation and returns a result instead of throwing:
`{ success: true, data }` or `{ success: false, issues }`. (Unlike `safeParseStandardSchema`, which nests
the issues under `error`, the issues are on the result, the shape a YAML layer's validator returns.)

```ts
import { formatIssuePath } from '@schema-engine/forms';

export function loadForm(json: unknown) {
	const result = engine.safeValidateForm(json);
	if (!result.success) {
		for (const { path, message } of result.issues) {
			console.error(`${formatIssuePath(path) || '(form)'}: ${message}`);
		}
		return undefined;
	}
	return result.data; // the same frozen NormalizedFormConfig validateForm returns
}
```

It still throws for a misuse of the API, such as a registration whose Standard Schema is async. A YAML or
editor integration can pass `(value) => engine.safeValidateForm(value)` as its validator and map each
`path` to a source location.

### YAML forms

A form can be authored as YAML. `@schema-engine/registry/yaml` parses the text with the YAML 1.2 core schema,
calls your validator, and gives each issue a file, line and column. `engine.safeValidateForm` is the validator
as it is; `yaml` is an optional peer dependency of `@schema-engine/registry`, needed only by an app that
imports that subpath.

```ts
import { parseYaml } from '@schema-engine/registry/yaml';

const form = parseYaml(text, (value) => engine.safeValidateForm(value), { filename: 'contact.form.yaml' });
// throws a YamlDocumentError: contact.form.yaml:17:24 steps[0].elements[1].grid.width: Expected one of ...
```

For editor autocomplete, write `engine.generateFormConfigSchema({ io: 'input', target: 'draft-7' })` to a file and name it in a
`# yaml-language-server: $schema=...` header. The docs page `/docs/forms/yaml` (YAML Forms)
has recipes for Node, Bun, Vite and fetch.

The styling guides are in the docs: [Styling and layout](../../apps/docs/src/content/docs/styling/overview.mdx), [Layout themes](../../apps/docs/src/content/docs/styling/layout-themes.mdx) and [Registries and the catalog](../../apps/docs/src/content/docs/registry/registries.mdx).

### The form runtime

`createFormRuntime({ engine, config, defaults, snapshot, host, onSubmit, onChange, onAction, onActionResults })` is
the one lifecycle every renderer shares: it builds the form's container and owns the submission, the wizard's
steps and navigation, `form_mount` and `form_change`, and every action dispatch. A renderer only supplies the
`host` (`focus(paths)`, and `sync` and `submitNatively` where it needs them). See the
[runtime guide](./src/runtime/README.md) for the API, the outcomes and the rules (one lock, the reset rule,
submit as Next, skipped steps).

A step takes `constraints` (`show` or `hide`, on fields of earlier steps) to be skipped, and the form takes
`navigation: 'linear' | 'free'`. `collectStepActions(config, stepId)` lists the actions a trigger dispatches
while that step is current: the form's `actions`, then the step's own. `hasConfiguredActions(config)`
reports whether the form or any step configures one. Steps no longer accept `rules`, `onStepEnter`,
`onStepLeave` or `onStepValidate`; those never ran. Move an enter or leave hook into the step's `actions` with
`triggers: ['step_enter']` or `['step_leave']`; `onStepValidate` has no replacement. A JSON config that still
sets them has the keys stripped.

Action lists may contain inner arrays for parallel groups; see the [actions guide](./src/actions/README.md).
The runtime dispatches the form submit start, submit, success or error, and complete triggers; `onAction(action,
data)` runs after each successful submit action, and if it rejects that action becomes a fatal failure and later
submit actions stop. `onSubmit` runs after the submit actions and before the success or error trigger, and only
when the actions succeeded; a rejection fails the submission. A submission that failed leaves its reason in
`snapshot.submission.failures` as issues the form's one formatter words. Each result of the submit actions
carries the `actionId` of the configured action that produced it.
`buildFormActionContext` is an exported utility that constructs a form action
context with form data and timing metadata, including a stable step start time that resets
when the current step changes; it carries the current `stepId`, and `currentStep` and `totalSteps` count the steps that are not skipped. Its form state takes `errors` and `touched` by dotted path, so a handler reads `context.errors['address.street']` in every renderer, and
`userInteractions` counts touched fields plus `submitCount`, the submit attempts since the last reset, failed ones included.
The form state no longer accepts `touchedFields` or `isSubmitted`: pass `isValid`, `touched` and
`submitCount`, all required; the context's `isValid` is the one passed, the container's `snapshot.isValid` (see [action context form state](src/engine/README.md#action-context-form-state)).
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

### The form state container

The container owns a form's values, errors and field state and is the contract a renderer binds to. Its entries
are `@schema-engine/forms/state-container` (the contract types, `createFormStateContainer`, the selectors and
hydration), `@schema-engine/forms/csrf` and `@schema-engine/forms/server-errors`; see the
[container guide](./src/state-container/README.md). A container of your own, or a store that must behave like
this one, proves it with the conformance suite, which registers its cases with vitest (an optional peer
dependency):

```ts
import { formStateContainerConformance } from '@schema-engine/forms/testing';
import { createMyContainer } from './my-container';

formStateContainerConformance(createMyContainer);
```

### Class and style

A form, a step and a field each take `className` and `style` as an escape hatch
for CSS the engine's vocabulary does not cover. `className` is applied as written
to the form element or the step element (`<div class="se-form-step">` in React,
`<se-form-step>` in Radiant, both marked `data-se-step`). On a field it is
applied to the field host, the element that carries the field's `style` and `data-se-*` attributes, in both renderers.
`style` accepts only CSS custom properties: keys that start with `--` and string
or number values. Custom properties mean the same in every renderer and write
the same in JSON or YAML, whereas a named property such as `maxWidth` would be
read as camelCase `CSSProperties` by React and as a plain record by Radiant.
`validateForm` rejects any other key and names it, and a string value that contains
`;`, `{` or `}`, which would start another declaration once the markup is server rendered.

```ts
{ id: 'checkout', className: 'checkout-step', style: { '--accent': '#f60' }, title: 'Checkout', elements: [] }
```

### Layout theme

Grid and appearance come from [`@schema-engine/layout`](../layout/README.md), which does not depend on
forms. The engine takes them together as the `layout` option, either inline or as a theme compiled
once with `createLayoutTheme` and shared between engines (the same `data-se-theme` and one stylesheet):

```ts
import { builtInAxes, createLayoutTheme, defineAxis } from '@schema-engine/layout';

const tone = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone' },
	default: 'neutral',
	values: { neutral: {}, brand: { '--se-accent': '#f60' } },
});

const engine = createFormEngine({
	layout: { grid: { minColumnWidth: '12rem' }, appearance: [...builtInAxes, tone] },
});

const theme = createLayoutTheme({ appearance: [...builtInAxes, tone] });
const checkout = createFormEngine({ elements, layout: theme });
const profile = createFormEngine({ elements, layout: theme });
```

Inline options are compiled with the renderer's `data-se-*` attribute names reserved
(`RENDERER_DATA_ATTRIBUTES`), so an axis cannot reuse one; a theme you compile yourself is re-checked
against that list when the engine is built. `engine.getLayout()` returns the frozen theme: `id`
(the `data-se-theme` value), `grid`, `axes` (axis name to its values), `appearance` (the axes as a read-only registry) and the stylesheet `css`. `engine.extend()` inherits it,
and `layout` is not an extend option.

Moving to the layout theme removed these, with no aliases:

- The `grid` and `appearance` engine options, and `getCompiledGrid`, `getGridTheme` and `getAppearance` (use `layout` and `getLayout()`).
- The `@schema-engine/forms/lib/grid-styles` and `lib/appearance` subpaths, and the appearance exports of the package root. The grid and appearance schemas, types and helpers (`ElementGridConfig`, `GridLayoutConfig`, `getGridVariables`, `getGridItemVariables`, `getAppearanceAttributes` and the rest) come from `@schema-engine/layout`; the emitters were `getFormGridVariables` and `getFieldGridVariables`.
- `data-se-grid-theme` and `data-se-appearance-theme`, replaced by `data-se-theme`; and the React `useGridThemeId`, now `useLayoutThemeId`. A host built by hand adds `se-grid-item` and `data-se-theme` (`useFieldHost` does).
- The `theme` and `theme-css` attribute names are now reserved, so an appearance axis cannot be called `theme`.

### Appearance

An **appearance axis** is one independent dimension of appearance with 2 to 5 named
values; each value stands for a set of semantic CSS tokens that components read (see
[`@schema-engine/layout`](../layout/README.md#appearance-axes) for `defineAxis` and the rules
for a good axis). The layout theme declares the axes in its `appearance` list, held in a
read-only registry. `builtInAxes` is the default: `size` (`compact | default | comfortable`)
and `surface` (`flat | outlined | elevated`). A host adds an axis by listing it after the
built-ins; an axis listed later with the same `$type` replaces the earlier one, so a host
overrides a built-in axis the same way. The built-in tokens name no host theme; a renderer
maps them to its own (Radiant's card falls back to `--space-6`), and `size: default`
sets its tokens to `initial`, so it looks like no pick in a themed app.

```ts
import { builtInAxes, defineAxis } from '@schema-engine/layout';

const tone = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone' },
	default: 'neutral',
	values: { neutral: {}, brand: { '--se-accent': '#f60' } },
});
const size = defineAxis({
	$type: 'size',
	metadata: { name: 'Size' },
	default: 'default',
	values: {
		compact: { '--se-space': '0.5rem' },
		default: { '--se-space': 'initial' },
		comfortable: { '--se-space': '2rem' },
	},
});

const engine = createFormEngine({ layout: { appearance: [...builtInAxes, tone, size] } });
```

Keep the axis list inline, as above, or declare it `as const`: a list stored in a plain
variable widens, and typed `defineForm` stops narrowing the values. The card's width is the readable measure `--se-measure`, which `size` sets (24rem compact,
32rem comfortable), so overriding the compact spacing does not resize the card. `size` also sets the control height `--se-control-height`, through the hooks `--se-control-height-compact` (`1.75rem`) and `--se-control-height-comfortable` (`2.25rem`). An author sets the hooks on `:root` or any ancestor; a renderer maps its theme to the `--se-renderer-*` twin each hook falls back to, so the author's value wins in every renderer.

The engine lists every axis in its schema catalog (`axis:size`) and in the JSON Schema
export, where `appearance.size` is an enum of the axis's values, so an editor autocompletes
a form's and a step's picks. An element's `appearance` lists exactly the axes its registration
declares in `appearanceAxes`, and a recipe slot's lists exactly the axes the recipe declares for it
(`appearanceAxes: { shell: ['size', 'surface'] }`), each an enum of its values with
`additionalProperties: false`, so an undeclared axis is rejected. Validation checks the pick on
every element and slot, so every one gets the key: an owner that declares none gets a closed
`appearance` with no axes. The lists come from the registry and declarations validation checks
(`checkAppearance`), so the export and validation cannot drift; a parity test walks fixture
elements (open, strict, non-strict without an `appearance` key, piped) and the built-in recipes
through both, at the top of a step and nested in a fieldset and an array row. The children of an
element's `elements` array are typed as a lazy union of every element's export schema, so a nested
field gets the same closed `appearance`. The limits: a schema that is an object, or a pipe or prefault
of one, is rewritten, but a lazy schema keeps its own `appearance` (validation still checks it); and a
native Standard Schema element contributes an envelope of its `$type` and the same closed
`appearance`. The catalog keeps each registration's own validator schema, so `getBySchema` finds it.

A form, a step, a field and a view slot pick values with `appearance`, and the
typed `defineForm` narrows the values to the engine's axes:

```ts
engine.defineForm({
	id: 'checkout',
	appearance: { size: 'compact' },
	view: { $type: 'card', shell: { appearance: { surface: 'elevated' } } },
	steps: [{ id: 'pay', title: 'Pay', appearance: { size: 'default' }, elements: [] }],
});
```

Each element registration declares the axes it supports with `appearanceAxes`
(`defineInput({ $type: 'input', appearanceAxes: ['size'], ... })`), and each
recipe spec declares them per slot (`defineRecipeSpec({ appearanceAxes: { shell: ['size', 'surface'] } })`);
a slot that declares axes must accept an `appearance` key in its schema. An axis that is not
declared fails validation, and the engine build rejects a registration that declares an axis the vocabulary lacks (a typo such as `'sise'`), naming the registration and the axis. `AppearanceAxisList` is the shared type of those declarations. `validateForm` rejects an unknown axis, an undeclared axis for that
owner and an unknown value, naming the path and the allowed values, and writes the resolved
appearance (for a field: form, then step, then containing elements, then the field itself; for a view slot: the form, then the slot itself; each keeping
only the axes it supports) into the normalized config. The inheritance walk is `resolveAppearance`
(`lib/resolve-appearance.ts`); checking, merging and attribute helpers are in `@schema-engine/layout`.
Renderers emit `data-se-<axis>` attributes and the token rules, which are part of the layout
theme's one stylesheet and sit inside `:where()`, so an author's `className` wins. The
built-in card shell no longer takes `maxWidth`, `padding` or `shadowSize`: it reads the semantic
tokens `--se-space`, `--se-border-width`, `--se-shadow` and `--se-surface-background`, and maps
`--se-space` to its own width. The wizard `actions` slot's former `appearance` key is now `variant`.

### Grid theme

The layout theme also owns the grid vocabulary through the optional `grid`
half of `layout`: breakpoint thresholds (`sm`…`2xl`, CSS lengths), gap token definitions
(`none | compact | default | loose | wide`), and the default minimum column
width for `columns: 'auto'` grids. Gap tokens can change by breakpoint, so one
token carries a whole responsive rhythm and a form that selects it inherits that
rhythm without any `responsive` entry of its own:

```ts
createFormEngine({
	layout: {
		grid: {
			gap: { default: '1rem', loose: '1.5rem' },
			responsive: {
				md: { default: '1.25rem' },
				lg: { default: '1.5rem', loose: '2rem' },
			},
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
theme's by design.

An individual element can set its own rhythm with `grid.marginBlockStart` and
`grid.marginBlockEnd`, which accept the same gap tokens and are responsive per
breakpoint like the rest of `grid`:

```ts
{ $type: 'submission-alert', id: 'status', name: 'status',
  grid: { marginBlockEnd: 'wide', responsive: { lg: { marginBlockEnd: 'loose' } } } }
```

Fields can also be placed by name instead of CSS grid lines:
`grid: { width: 'half', offset: 'quarter' }` (`width` is `full | three-quarters |
two-thirds | half | third | quarter`, `offset` the same without `full`), with per-breakpoint changes in `grid.responsive` like any other key. A
step whose top-level fields use `width` or `offset` is laid out on 12 tracks and a
field that sets no width fills the row. `validateForm` rejects a form grid that
sets `columns` or `minColumnWidth` alongside such a field, and a field that sets
`width` or `offset` together with a raw `column`, an offset plus width past 12
tracks. Fieldsets and array rows lay their children out on their own grid, so
the same keys work on a container's children. Raw `column`, `row` and
`placeSelf` remain the escape hatch; `column: 2` means the grid line 2, not a
span.

Layouts that width and offset cannot say (a field spanning rows beside stacked
fields) are drawn with `areas`: `grid: { areas: ['a a a b b b', 'a a a c c c', 'd d e e e e'] }`
(or a record keyed `default`, `sm` ... `2xl`, which must include `default`), and
each field claims a name with `grid: { area: 'a' }`, also responsive through
`grid.responsive`. `.` is an empty cell and the column count comes from the
rows. A step takes its own `grid`, which replaces the form's for that step.
`validateForm` rejects ragged or non-rectangular templates, an `area` that is not
in the template at a breakpoint, a template area no field claims, `areas` beside
`columns` or `minColumnWidth` or width fields, an `area` beside `width`,
`offset`, `column` or `row`, and an `area` on a container's child (containers
take no `areas`). Names are ASCII CSS identifiers and cannot be `auto`, `span`,
`none`, `default` or a CSS-wide keyword; the exported JSON Schema carries the
same pattern. A field with no `area` is auto-placed, two fields may claim one
area (for fields never shown together), a field hidden at a breakpoint need not
be in that breakpoint's template, and raw `column`/`row` on other fields work as
usual. A step with no fields under a form-level `areas` needs `grid: {}`, or
validation reports the template areas as unclaimed. `stepGrid(config, step)` is
the one place the step-replaces-form rule lives; renderers and validation both
use it.

This applies to any element rendering a `.se-grid-item` host (`se-form-field se-grid-item`) with the
engine's theme id — not only inputs. Renderers expose a helper for elements that build
their own container (`useFieldHost` in React, `mergeFieldGridHost` in Radiant). A custom container whose children use `width` or `offset` must lay them out on its own grid with `useChildGridProps` (React) or `mergeChildrenGridHost` (Radiant). Every engine exposes a frozen
`engine.getLayout()`, computed once at construction (library defaults apply when
`layout` is omitted). Configured breakpoint
thresholds must preserve named cascade order (`sm ≤ md ≤ lg ≤ xl ≤ 2xl`);
`rem`/`em` lengths compare at a 16px root so mixed units cannot invert the
sequence. Forms consume those tokens in their `grid` configuration (`columns`,
`gap`/`gapX`/`gapY`, `responsive` entries, per-field `grid` placement).
Renderers emit the scoped stylesheet (`data-se-theme`) inline during
render, so responsive layout is CSS-driven — no runtime observers, and SSR
output is styled before hydration. The stylesheet owns the neutral defaults,
the breakpoint cascade, and the resets that keep nested grids isolated; inline
styles carry only the values an author actually wrote, so an unconfigured field
emits none at all. The stylesheet selects only `.se-grid`, `.se-grid-item` and
`[data-se-theme]`; renderers add those beside `se-form-grid` and `se-form-field`, which stay as
styling hooks. Gap tokens stay host-overridable: the theme declares its
defaults privately and reads `var(--se-grid-gap-<token>, …)`, so a `:root`
override still wins. An item host that needs its own layout sets
`--se-item-display-mode` rather than `display`, because the generated item
rule outranks a bare class.

Single-step forms may omit `view` to render fields directly. Multi-step forms
that omit `view` get `{ $type: 'bare-controls' }` written by `validateForm`;
`createFormEngine({ defaultWizardRecipe })` names a different wizard recipe
(the engine build throws for a name that is not a registered wizard recipe, and
`engine.extend()` inherits it). If the default recipe is not registered,
`validateForm` still succeeds, warns, and leaves the form without a `view`, so
renderers show fields without chrome. `validateForm` also merges the recipe's
`slotDefaults` under the author's slot config (deep for plain objects) and stores
the result in `view`; renderers read it and apply no defaults. It checks kind and
slot config when `view.$type` is set.

## Engine validation

Validation rules are registrations like elements, recipes and actions: `$type`
(the `type` authors write in a field's `rules`), `schema` (a Standard Schema for the
rule object), `metadata`, and the handler fields `category`, `handler`, and optionally
`dependsOn` and `defaultFor`. The engine builds a read-only registry
(`engine.getValidationRegistry()`, with `kind` `'Validation'` and no `register` or `clear`) from, in
order, the built-in rules, the `validations` of the winning elements, and
`createFormEngine({ validations: [...] })`. A later registration of the same
`$type` wins without a warning, and a schema that is not a Standard Schema throws
at build. `engine.extend({ validations })` adds to the source engine's list. The
per-field-type default rules (`defaultFor`) are derived from the registrations at
build. Elements contribute in the element registry's order: a replaced `$type` keeps its first position, so for elements [A1, B, A2] where all declare the same validation `$type`, B's validation wins.

```ts
import * as z from 'zod/mini';
import { createFormEngine } from '@schema-engine/forms';

const postcode = {
	$type: 'postcode',
	schema: z.object({ type: z.literal('postcode'), message: z.optional(z.string()) }),
	metadata: { name: 'Postcode' },
	category: 'string',
	handler: (rule: { type: 'postcode'; message?: string }) =>
		z.string().check(z.regex(/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/, rule.message ?? 'Invalid postcode')),
} as const;

const engine = createFormEngine({ validations: [postcode] });
```

Field rules then use it as `{ type: 'postcode', message: '...' }`. Rule objects keep
`type`; only the registration is keyed by `$type`. See the
[validation guide](./src/schemas/validation/README.md) and the
[custom validations page](../../apps/docs/src/content/docs/forms/validation-custom.mdx).

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
  `{ issues, failures }`: one issue for each rule the value fails, in rule order, with the rule's `type`,
  `ruleId` (its `id`), `params` (its options as authored), a fallback `message` and its `severity`, and a
  `FormValidationFailure` for each rule that could not run.
- `validateFormValues({ steps, values, registry, names?, debounceScope })` validates the
  selected paths (`exactNames` limits it to the named paths themselves) and returns
  `{ issues, failures }` by dotted path, such as `issues['address.street']`; a container and a row inside
  it can both fail. An empty `names` validates nothing. Fields hidden by a constraint, disabled fields and
  everything inside them are skipped, and so are the fields of a skipped step (`steps` carry their `constraints`).

Both helpers require a caller-owned `DebounceScope`, which carries async debounce
state across validation calls for a form. Each rendered field path is keyed
separately, and each form should own its scope. A scope created per call would
delay debounced rules without coalescing them.

Required rules, `relate`, constraint emptiness operators, and async skip checks
share the same empty values: `undefined`, `null`, `''`, and `[]`. `false` and
`0` count as present. `validateForm` and `validateElement` reject rules without
a registered handler with a `FormValidationError` naming the field and rule, at the path of that
rule's `type`.
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

| Layer                                                           | Owns                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@schema-engine/forms`                                          | Engine, validation, actions, recipe protocol, the form runtime (`createFormRuntime`), the form state container (`@schema-engine/forms/state-container`) and its conformance suite (`@schema-engine/forms/testing`), `FieldArrayValue` — no widget `$type` schemas |
| `@schema-engine/forms-react`                                    | React renderer components; the form state hooks at `/hooks`; the form state is the engine's container                                                                                                                                                             |
| `@schema-engine/forms-radiant`                                  | Radiant widgets, default-aware SSR constraints, shells, blocks, and scoped form controllers                                                                                                                                                                       |
| Schema Engine shadcn registry (`schemaFormRegistrations`, etc.) | Copied React widgets, colocated field schemas, and view recipes for the React renderer                                                                                                                                                                            |

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

Engine construction stores elements, recipes, actions and validation rules in read-only registries
from `@schema-engine/registry` (last registration wins, no override warning) and
checks each winning schema once at that boundary. It stores frozen shallow copies taken at build and leaves the registration objects you passed untouched; changes to them afterwards do not reach the engine. Form action results add optional browser redirects
to the generic result; see [actions](./src/actions/README.md).

## Pre-publish API

Use `FormActionTrigger` and `BuilderActionRuntimeContext` for form actions. The
`@schema-engine/forms/actions` entry exports `ActionDispatcher` for renderers.
Recipe lookup accepts an engine or `{ getRecipe }` object. Grid configuration
rejects unknown keys, including `rows`, `autoFit`, `autoFill`, and
`maxColumnWidth`; automatic columns use `columns: 'auto'` and `minColumnWidth`.
Recipe metadata has no `deprecated` property.

React uses the engine's validation, step state, submission triggers and action
context builder; see the [React renderer contract](../forms-react/README.md#validation-navigation-and-action-contexts).
Action context `form` objects must implement `reset`, `setValue`, `getValue`, `validate`
and `checkValidity`, including for custom renderer integrations.

The validation dependency index also tracks `require` constraints, so renderers
can clear conditional required errors when a controlling value changes.
