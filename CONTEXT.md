# Schema Engine — context

## Zod Mini and Standard Schema boundary

The engine uses Zod Mini for its first-party schemas and keeps Standard Schema as the provider-neutral registration boundary:

| Layer                  | Role                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `registry` / `actions` | `StandardSchemaV1` on every `BaseRegistration.schema`                                                   |
| `forms`                | Zod Mini for first-party authoring and JSON Schema export; `~standard.validate` at registration/runtime |
| `forms-react`          | Headless renderer; copied registry widgets carry their own field schemas                                |
| `forms-radiant`        | Radiant widgets and colocated field schemas; not required to match registry schemas                     |

Default widget `$type` schemas (for example `input`, `drop-zone`) live beside each implementation — shadcn registry sources and `forms-radiant` — not in `forms`. Custom registrations use the engine contract only (`defineInput`, `BaseFieldSchema`, Standard Schema). Shared docs examples use the overlapping subset both renderers support; library-shaped keys (iMask, drop-zone `accept`) are implementation contracts and may differ.

### Rules

1. **Author** first-party field/action/config schemas with the functional `zod/mini` API. Installing the `zod` package is required to import its `zod/mini` entry point.
2. **Register** the concrete schema. Prefer `defineInput` / `defineStatic` so the render function is checked against schema **output**. Consumer schemas may come from any Standard Schema provider, including Zod, Valibot, and Effect Schema.
3. **Validate** via `~standard.validate` at engine and action boundaries. The forms package wraps the spec call in `safeParseStandardSchema` (`packages/forms/src/lib/standard-schema.ts`; import as `@schema-engine/forms/lib/standard-schema`) for callers that prefer a tagged result over a thrown error.
4. **Consumers** may register custom elements with a hand-written Standard Schema — they are not required to install Zod unless they use Zod-authored built-ins.

Form authors supply schema **input** (defaults stay optional). After `defineForm` / `validateForm`, components receive schema **output**. Nested container `elements` are authored against the same engine registrations as top-level fields.

### Proof test

`packages/forms/test/lib/standard-schema-engine.test.ts` registers a native Standard Schema element, builds a FormEngine, and runs `defineForm`. Renderer packages exercise the same registration through `FormRenderer`.

## Forms logging

`@schema-engine/forms` and the renderer packages use `@ecopages/logger` through
each package’s shared `logger` instance. The forms instance is also exported as
`@schema-engine/forms/lib/logger`. Tags identify
the package (`[schema-engine/forms]`, `[schema-engine/forms-react]`, and so on).
Debug output stays off unless the host enables Ecopages log levels.

## Radiant form state

Radiant UI's form store owns control registration, values, validation, and field
presentation. It publishes that store on `formContext`. `@schema-engine/forms-radiant`
exposes scoped `FormController` instances that read `formContext` from a host
inside `rui-form`; there is no global active form store. They read
`formContext.store` instead of a private host field. Decorators are
optional lifecycle wiring around that controller.
Radiant UI registration uses flat dotted field names. Controller reads, action
context values and errors, constraints, and submission use the engine's nested value tree.
`se-form-instance` coordinates one submission per form instance: it owns the
submitting state and the submission events, and runs the configured form actions
through a plain `FormActions` object built for its config and engine, not through
elements that find each other in the document. The app binds the client engine by
assigning `engine` to `se-form-renderer`, before or after it upgrades, and the instance,
array and fields follow the renderer's context, so they catch up with an engine that
arrives or changes later.

## React form state

React Hook Form's instance lifetime follows the identity of the normalized form
config passed to `FormRenderer`. Replacing that config starts a fresh instance
with its defaults and step state. The change watcher subscribes to field value
changes, so a parent render by itself does not call `onChange` or dispatch a
`form_change` action.

The React Hook Form adapter converts the engine's null-prototype value maps to
ordinary records at its boundary. React Hook Form does not clone null-prototype
records, so passing them directly aliases its initial and live values and makes
reset restore edited values. Nested maps and array rows follow the same rule.

Radiant `FormEngineController` subscribes to the nearest ancestor
`formEngineContext` and resolves the active owning render on initial reads.
Renderer-owned field rendering resolves an explicit engine, then
that context, then the engine owning the current render. `se-form-renderer`
publishes a plain engine snapshot on the context. There is no module-level engine
registry or implicit single-engine fallback, so standalone hosts must receive an
engine through a renderer context or an explicit prop.
Constraint resolution belongs to the engine, not to a renderer. A constraint
names a sibling (`accountType`), so its value path depends on where the
declaring field is rendered: inside `contacts.0.email` the sibling is
`contacts.0.accountType`. `resolveConstraintPath` and `evaluateConstraints` in
`@schema-engine/forms/constraints` own that rule, and a renderer passes the
rendered field path plus the value tree rather than resolving paths itself. A
one-element array compares as its element, so a single-selection control matches
an authored scalar.

Field references resolve identically for constraints and for validation, and
that is deliberate: `resolveFieldRef` in `@schema-engine/forms/lib/field-ref` is
the single implementation, and `resolveConstraintPath` is an alias of it. A
validation handler reaches it through the `ValidationContext` its second
argument carries — `resolve`, plus the form's nested `values` and the field's
rendered `fieldPath`. The context is required rather than optional so a renderer
cannot omit it and leave cross-field rules silently passing, which is what
happened while it was optional.

A rule that reads other fields declares them through `dependsOn` on its
registration, and `buildDependencyIndex` inverts those declarations into a
change-to-dependents map over rendered paths. Both renderers re-validate
dependents from that map and both ask `shouldSurfaceDependentError` whether the
result may be shown — touched, or the form submitted. That gate lives in the
engine rather than in each renderer, because the constraint subsystem already
demonstrated what happens when a decision of this class is made twice.
See [the controller contract](./packages/forms-radiant/src/adapters/radiant/controller/README.md).

## Recipes and the resolved view

A **recipe protocol** is the vocabulary a domain gives its recipes: the **slots** it
composes (in order), the **kinds** a recipe can take, and the **rules** that check a
recipe's kind against the slots it declares. `@schema-engine/layout` owns the machinery
that is the same for every domain: the spec, its binding to a render payload, slot
defaults and their merge, and `resolveRecipeView`, which resolves a document's view (below),
with the checks that a slot default parses against its slot schema and that a slot declaring
appearance axes accepts an `appearance` key. A domain declares its
protocol once with `defineRecipeProtocol({ slots, kinds, rules })`, and its specs and
bindings are then typed by it: a slot or kind outside the protocol is a type error, and
the rules run when a spec is defined and, on each winning registration, when the domain's
`Recipe` registry is built (`createRecipeRegistry`). Forms declares `shell | header |
progress | actions` and `single-step | wizard`, with the rules that a single-step recipe
declares no `progress` slot and a wizard recipe declares `actions`; the built-in form
recipes and their slot schemas stay in `@schema-engine/forms`.

A form selects a recipe with `view.$type`. `validateForm` writes the **resolved view**
into the normalized config, by calling layout's `resolveRecipeView` for the recipe
the view selects and keeping the form-only rules (the default wizard recipe, the step
count each kind needs, how schema issues are reported). Every slot the recipe declares is present and complete, so
renderers and blocks read it without parsing or defaulting. A slot's keys resolve in
this precedence: the author's config, then the recipe's **slot defaults**
(`slotDefaults` on the spec), then the slot schema's own defaults.

A multi-step form that omits `view` gets the engine's **default wizard recipe**
(`bare-controls`, or `createFormEngine({ defaultWizardRecipe })`) as its resolved view.
Engine build rejects a default that is not a wizard recipe. When the default is not
registered, `validateForm` warns once per form id and every step renders on one page.

## Wizard navigation

The engine's step navigator (`createStepNavigator`) owns wizard navigation for every
renderer: it ignores a request while another is in flight, validates the active step
before `next`, and dispatches `step_leave` before the step changes and `step_change`
then `step_enter` after. A renderer supplies where its step state lives, how to
validate a step and how to dispatch a trigger, so a new renderer inherits the guard and the trigger order.
A step state reset calls the navigator's `cancel`: the navigation in flight writes no
state and dispatches no further trigger, and the next request is accepted at once.
Radiant cancels when its config changes or the instance disconnects or reconnects; React
cancels on unmount, which a replaced config causes.

A step's **step actions** (its `actions`) are active while that step is current: every
trigger dispatches the form's `actions`, then the current step's, and
`collectStepActions` is the single rule both renderers use. Because `step_leave`
fires while the step being left is current and `step_change` and `step_enter` once the
entered step is, a step's `step_enter` action runs on entering that step and its
`step_leave` action on leaving it, by Next, Previous or a jump. Completing the last
step is a submission, not a step trigger: track it with `form_submit_success`.
Steps have no separate enter, leave or validate hooks.

## Array rows

A **row default** is the value a new array row starts with, whether the user
adds it or the form seeds it. `createArrayRowDefault` in `@schema-engine/forms`
is the single rule: each named child contributes its `defaultValue` (`''` for a
leaf without one, child containers recurse), then the container's
`initialValues` record is shallow-merged over it. A scalar row (one leaf child,
no object-shaped seed) is that child's default, without `initialValues`. **Seeded rows** come from
`seedArrayRows`: an array without a value starts with `minItems` rows, and at
least one when any descendant declares a `defaultValue`; a supplied array is padded to
`minItems`. `collectInitialValues` applies both to a form's initial values.
Every helper detects arrays by the registration's `containerKind: 'array'`,
never by `$type`, so custom array widgets seed like `arrayElements`.
A scalar row may hold `''`, `0` or `false`; both renderers keep it. Errors and
touched state follow their row through every field-array operation, an operation
naming a row that does not exist does nothing, and `remove` removes a repeated
index once.

## Container state

A fieldset or array passes two states to every field inside it, at any depth.
While a container's `require` constraint holds, the fields inside it are
required; the container's own `required` rule does not pass down. A disabled
container, authored or by a constraint, disables them, and a disabled array
disables its add and remove buttons too. React validates the inherited
requirement through `validateFormValues`, Radiant through its `se-constraint` hosts.
Two Radiant gaps remain: a container that declares any constraint also passes
its own `required` rule down, and the add and remove buttons take the array's
disabled state at render only, so a `disable` constraint that starts to hold
later disables the rows but not the buttons.

## Layout theme

Grid and appearance live in `@schema-engine/layout`, which knows nothing about
forms, so any container of items can use it. `createLayoutTheme({ grid,
appearance }, { reservedNames })` compiles both into one **layout theme**: one
`id` and one stylesheet (`css`). Renderers put that id on
the form, grid and item elements as the single `data-se-theme` attribute and
emit the stylesheet for each form: React hoists equal stylesheets to one element,
while Radiant, which has no head hoisting, carries an identical self-contained copy in
every form (by design: each form is styled before hydration whatever the render
order, streaming, caching or removal of the others). `createFormEngine` and `createRadiantFormEngine` take
the theme as `layout`, either a compiled theme or inline `{ grid, appearance }`
options; there are no separate `grid` or `appearance` options. Engines built on
one compiled theme share its id and stylesheet, so a form embedded in a page
matches the page, and `engine.extend()` inherits the theme. `reservedNames` is a
compiler input: each domain lists the `data-se-*` attributes its renderers
already write, and an axis cannot reuse one (forms passes
`RENDERER_DATA_ATTRIBUTES`; an engine re-checks a theme compiled elsewhere).

The layout stylesheet knows no domain. It selects only `.se-grid`,
`.se-grid-item` and `[data-se-theme]`, and there is no alias for another class.
A renderer adds those two classes beside its own (`se-form-grid se-grid`,
`se-form-field se-grid-item`) on step grids, field hosts and container inner
grids; the forms classes stay as styling hooks.

## Grid theme ownership

Responsive grid layout is pure CSS. The **layout theme** owns the grid
vocabulary — breakpoint thresholds (`sm`…`2xl`), gap tokens (`none | compact |
default | loose | wide`), and the default minimum column width — through the
`grid` half of `layout`. The **form** owns layout intent: `columns`,
`gap`/`gapX`/`gapY` selection, `responsive` entries per breakpoint, and
per-field `grid` placement. Renderers emit the theme-scoped stylesheet
(`data-se-theme` identity) and per-container CSS variables inline during
render, so responsive behavior is media-query driven with no runtime
observers, SSR output is styled before hydration, and two engines with
different themes cannot overwrite each other. Field names must not collide
with `HTMLFormElement` properties in Radiant (e.g. `tagName`, `elements`) —
the form host carries field state keyed by field name. Configured breakpoint
thresholds must preserve named cascade order (`sm ≤ md ≤ lg ≤ xl ≤ 2xl`);
`rem`/`em` lengths are compared at a 16px root.

The split between the two is strict: **the stylesheet owns behavior** —
neutral defaults, the breakpoint cascade (each media query falls back through
the narrower slots), and the `initial` resets that stop a nested grid or field
inheriting its parent's placement. **Inline custom properties carry only
values** an author wrote, so an element without a `grid` config emits no style
attribute. `place-*` shorthands are resolved into their axis longhands before
emission rather than declared in CSS, because a shorthand would have to follow
the longhands in the generated rule and would reset them; the split follows the
CSS grammar, so a two-keyword axis value such as `safe center` stays on one
axis.

Named widths are the same mechanism, not a second one. An element's `grid.width`
(`full | three-quarters | two-thirds | half | third | quarter`) and
`grid.offset` (the same names without `full`) resolve to spans and
start lines on 12 tracks and are emitted into the shared `grid-column` slot, so
they inherit the breakpoint cascade (`grid.responsive`) and the inheritance
resets. They are one declaration, so a slot that authors only one of the two
carries the other from the narrower slots, as `columns` and `minColumnWidth` do
for the template. A step whose top-level elements use `width` or `offset` gets
the 12-track template and a `--se-grid-default-column` of `1 / -1` inline from
`getGridVariables`, which the stylesheet resets on every grid and reads as
the fallback of a field's `grid-column`, so a field with no width fills the
row. A grid uses areas, `columns` (and `minColumnWidth`) or widths: validation
rejects both together, a field that sets `width` or `offset` with a raw
`column`, an offset plus width past 12 tracks (counting values carried from
narrower slots). A raw `column` field beside width fields counts the same 12
tracks (`span 2` is a sixth of the row). Raw `column`, `row` and `placeSelf`
remain the escape hatch, and `column: 2` is a grid line, not a span.

Drawn layouts are the same mechanism again. A grid's `areas` (an array of row
strings, or a record per cascade slot) is emitted as a `--se-grid-areas` custom
property of quoted rows, with `--se-grid-template` carrying the track count the
rows draw, one pair per slot the author wrote. The stylesheet reads
`grid-template-areas` through the breakpoint cascade with a `none` fallback and
resets it like any other grid property. A field's `grid.area` is emitted as its
`grid-column` and `grid-row` (a lone name there means that area's start and end
lines), so it rides the shared field table with no new rule. Area names are
ASCII CSS identifiers, which the schema enforces (and the JSON Schema export
carries as a case-explicit pattern): the pattern keeps quotes, `;` and
whitespace out of the quoted template and out of the area value. It does not
sanitize the other authored values that reach `var()`, such as raw `column`/`row`
and gaps, which stay the author's CSS. A step's `grid` replaces the form's grid
for that step (`stepGrid(config, step)` in `form-view.ts` is the one owner of
the rule, used by validation and both renderers), because a template names
specific fields. Validation reads templates and areas
through the same cascade the stylesheet applies and rejects ragged or
non-rectangular templates, an area outside the template at any breakpoint, an
unclaimed template area, `areas` beside `columns`, `minColumnWidth`, `width` or
`offset`, and `area` beside `width`, `offset`, `column` or `row`. Containers take
no `areas`, so `area` on a container's child is rejected.

Containers are grids too. A fieldset, and each array row, lays its direct
children out in an inner `se-form-grid se-grid` carrying the engine's theme id, built
with the same `getGridVariables(undefined, layout.grid, children)` a step uses; a field
host takes its variables from `getGridItemVariables(grid)`.
The grid rule resets `--se-grid-default-column` on every grid and the inner
grid declares its own, so a child's width and default placement come from its
container and never from the step around it. The step's `columns` and a
container's child widths therefore do not conflict; the over-width and raw
column checks apply to every element at any depth.

Two contracts follow from the field rule outranking a component's own class.
Gap tokens (`--se-grid-gap-*`) are never declared on an element — the theme
declares `--se-grid-gap-base-*` and reads the public token with that as the
fallback — so a host's `:root` override still applies. Gap tokens may change by
breakpoint through the theme's `grid.responsive` option, which is breakpoint-major
like a form's own: each entry lists the tokens that change at that width. A ramp
redeclares only the base variable inside the generated media queries, so a form
selecting `gap: 'default'` inherits the rhythm and rhythm stays theme vocabulary
rather than form intent. A host override replaces the token at every width, ramp
included, since the public token is the first `var()` argument.

Per-element rhythm is part of the same mechanism, not a second one. An element's
`grid.marginBlockStart` / `grid.marginBlockEnd` take the same gap tokens and ride
the shared item property table, so they inherit the breakpoint cascade and the
inheritance resets and one system keeps owning the block axis. They apply to any
element that renders a `.se-grid-item` host (`se-form-field se-grid-item`) carrying the engine's theme id —
inputs get it from the field primitive, and a content or decoration element opts
in with `useFieldHost` (React) or `mergeFieldGridHost` (Radiant). An element
without that host ignores its `grid` config entirely. And an item host with
its own layout sets `--se-item-display-mode` instead of `display`, which
responsive `hidden` toggles against rather than forcing `block`.

## Appearance axis

An **appearance axis** is one independent dimension of appearance, with 2 to 5 named values. Each value
stands for a set of semantic CSS tokens, which components read; components never read an axis
value. The theme declares the axes (`defineAxis`, held in a read-only registry), a registration
declares which axes it responds to (`appearanceAxes`), and a document picks values that pass down
from the document to a container to an item or slot, a closer pick winning. A good axis:

- is orthogonal to the other axes;
- means the same on every component, so a token names a role (`--se-space`, `--se-shadow`), never a
  component; an idea that fits one component is slot config;
- has a small closed set of named values, because a raw value is a token override;
- controls appearance only, never structure, which is slot config or the grid.

`size` and `surface` are built in. The catalog and the JSON Schema export list each axis and its
values, so `appearance.size` on a form and its steps is an enum in an editor. An element's and a
recipe slot's `appearance` lists only the axes its registration declares, closed, so an undeclared
axis is rejected there as it is by validation.

## Appearance ownership

Named appearance mirrors the grid split. The **layout theme** owns the vocabulary through the
`appearance` half of `layout`: a list of **appearance axes** built with `defineAxis` and stored in a
registry. `builtInAxes` (`size` as `compact | default | comfortable` and `surface` as
`flat | outlined | elevated`) is the default list; a host writes
`appearance: [...builtInAxes, tone]` to add an axis such as `tone`, and an axis listed later with
the same `$type` replaces the earlier one. Each value stands for semantic CSS custom properties
(`--se-space`, `--se-shadow`). The **form** owns intent: a form, a step, a field or a view slot picks a value per axis with
`appearance: { size: 'compact' }`. A renderer never defaults or interprets a pick; it emits it.

Each element registration declares the axes it supports (`appearanceAxes`), and each recipe
spec declares them per slot; the engine build rejects an axis the vocabulary does not declare (`appearanceAxes: { shell: ['size', 'surface'] }`). An axis
that is not declared fails validation naming the axis and the owner, so the same config means
the same thing in every renderer. `validateForm` checks every pick against the vocabulary and the
declarations (an unknown axis, an undeclared axis for that owner, an unknown value), then writes
the **resolved appearance** into the normalized config the way it writes the resolved view: the
form's picks, then the step's, then each containing element's, then the field's own; a view slot
takes the form's picks and then its own. Each owner keeps only the axes it supports. An element without a resolved pick carries no
`appearance` key. An element registration's schema never sees the key; the engine strips it before
parsing and writes it back, so a custom element whose schema is strict still supports axes. A recipe slot
schema that declares axes must still accept an `appearance` key so authored configs type-check; the
engine does not pass it to the schema when parsing the view and writes the resolved pick back.

The names of the other `data-se-*` attributes the renderers write (`RENDERER_DATA_ATTRIBUTES`, which includes `theme`) are reserved and cannot be axes; forms passes the list to the layout compiler as `reservedNames`, and a test scans the renderer sources so the list cannot drift.

The pure appearance helpers live in `@schema-engine/layout`: checking a pick against the vocabulary
(`checkAppearance`), merging a parent pick with a child's (`mergeAppearance`), keeping the axes an owner
supports, and producing the attributes (`getAppearanceAttributes`). Walking the form tree is forms' job:
`resolveAppearance` in `lib/resolve-appearance.ts` is the one place the inheritance rule lives, called for
the form, each step, each element and each view slot.

Both renderers emit the resolved selection as `data-se-<axis>="<value>"` on the form element
(the one carrying `className` and `style`: `<form>` in React, `rui-form` in Radiant), the step
element (`data-se-step`), the field host and the slot elements. The token rules are part of the
layout theme's one stylesheet, emitted once per form. Each rule sits inside `:where()`, so it adds no
specificity and an author's `className` always wins; the scope is `data-se-theme`, the layout theme's
id, which sits on the form element and also on every grid and item. A rule reaches the element that
carries the theme and the pick together, or a descendant of the theme's root with no other theme
between, so the nearest theme wins: a form of one engine nested in a grid item of another takes its
own tokens, whichever stylesheet comes later. The same rules are emitted again as `@scope (theme) to
(other theme)` blocks, which a browser without `@scope` ignores; they make a theme re-entered below
another theme exact too, and, because scope proximity outranks source order, a zero-specificity author
rule such as `:where(.x)` loses to a token rule in a browser that has `@scope` (the layout README,
"Nested themes", has the details). Shells read
the tokens (`var(--se-space, 1.5rem)`) and keep the look of an unstyled form as the
fallback. The built-in tokens name no host theme: a renderer's fallback is where its host theme
variables belong (Radiant's card reads `var(--se-space, var(--space-block-lg, 1.5rem))`), and the
built-in `size.default` sets its tokens to `initial`, which hands them back to the component's
fallback, so `size: default` looks like no pick in a themed app, also inside a `compact` form. What a host's own axis looks like is the host's CSS, keyed on the same attributes. A value
that declares no tokens inherits the surrounding value's tokens through custom-property inheritance,
also from a pick made outside a nested form of another theme, until that form picks a value that
declares those tokens. The DOM contract is the same in
every renderer; the visual effect of a built-in value is not yet: `size` changes a field's font size in
Radiant only, and both card shells read the tokens. A field's `className` is applied to the same field host, the element that carries its `style` and the attributes, in both renderers. The field host that carries the attributes is the
inner `.se-form-field` (the Radiant constraint wrapper around it carries only grid placement).

`maxWidth`, `padding` and `shadowSize` are gone: the `size` and `surface` tokens set the padding, border and shadow, and the card's width is the readable measure `--se-measure`. `contentWidth`, `sideWidth` and
the structural keys (`showDescription`, `orientation`, `labels`, `align`) stay in slot config
because they change layout or content, not appearance. `style` is the escape hatch for what the
vocabulary does not cover and accepts only `--custom-property` keys with string or number values.
