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

## React form state

React Hook Form's instance lifetime follows the identity of the normalized form
config passed to `FormRenderer`. Replacing that config starts a fresh instance
with its defaults and step state. The change watcher subscribes to field value
changes, so a parent render by itself does not call `onChange` or dispatch a
`form_change` action.

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

## Wizard navigation

The engine's step navigator (`createStepNavigator`) owns wizard navigation for every
renderer: it ignores a request while another is in flight, validates the active step
before `next`, and dispatches `step_leave` before the step changes and `step_change`
then `step_enter` after. A renderer supplies where its step state lives, how to
validate a step and how to dispatch a trigger, so a new renderer inherits the guard and the trigger order.
The navigator does not notice a step state reset made while a navigation is in flight:
that navigation applies the state it computed before the reset.

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
requirement through `validateFormValues`, Radiant through live constraint sync.
Two Radiant gaps remain: a container that declares any constraint also passes
its own `required` rule down, and the add and remove buttons take the array's
disabled state at render only, so a `disable` constraint that starts to hold
later disables the rows but not the buttons.

## Grid theme ownership

Responsive grid layout is pure CSS. The **engine** owns the grid vocabulary —
breakpoint thresholds (`sm`…`2xl`), gap tokens (`none | compact | default |
loose | wide`), and the default minimum column width — through the `grid`
option on engine creation. The **form** owns layout intent: `columns`,
`gap`/`gapX`/`gapY` selection, `responsive` entries per breakpoint, and
per-field `grid` placement. Renderers emit the theme-scoped stylesheet
(`data-se-grid-theme` identity) and per-form CSS variables inline during
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

Two contracts follow from the field rule outranking a component's own class.
Gap tokens (`--se-grid-gap-*`) are never declared on an element — the engine
declares `--se-grid-gap-base-*` and reads the public token with that as the
fallback — so a host's `:root` override still applies. Gap tokens may change by
breakpoint through the engine's `responsive` option, which is breakpoint-major
like a form's own: each entry lists the tokens that change at that width. A ramp
redeclares only the base variable inside the generated media queries, so a form
selecting `gap: 'default'` inherits the rhythm and rhythm stays engine vocabulary
rather than form intent. A host override replaces the token at every width, ramp
included, since the public token is the first `var()` argument.

Per-element rhythm is part of the same mechanism, not a second one. An element's
`grid.marginBlockStart` / `grid.marginBlockEnd` take the same gap tokens and ride
the shared field property table, so they inherit the breakpoint cascade and the
inheritance resets and one system keeps owning the block axis. They apply to any
element that renders a `.se-form-field` host carrying the engine's theme id —
inputs get it from the field primitive, and a content or decoration element opts
in with `useFieldHost` (React) or `mergeFieldGridHost` (Radiant). An element
without that host ignores its `grid` config entirely. And a field host with
its own layout sets `--se-field-display-mode` instead of `display`, which
responsive `hidden` toggles against rather than forcing `block`.
