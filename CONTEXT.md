# Schema Engine — context

## Zod Mini and Standard Schema boundary

The engine uses Zod Mini for its first-party schemas and keeps Standard Schema as the provider-neutral registration boundary:

| Layer                  | Role                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `registry` / `actions` | `StandardSchemaV1` on every `BaseRegistration.schema`                                                   |
| `forms`                | Zod Mini for first-party authoring and JSON Schema export; `~standard.validate` at registration/runtime |
| `forms-react`          | Uses the forms and registry schemas; consumer registrations remain Standard Schema                      |

### Rules

1. **Author** first-party field/action/config schemas with the functional `zod/mini` API. Installing the `zod` package is required to import its `zod/mini` entry point.
2. **Register** the concrete schema. Prefer `defineInput` / `defineStatic` so the render function is checked against schema **output**. Consumer schemas may come from any Standard Schema provider, including Zod, Valibot, and Effect Schema.
3. **Validate** via `~standard.validate` at engine and action boundaries. The forms package wraps the spec call in `safeParseStandardSchema` (`packages/forms/src/lib/standard-schema.ts`; import as `@schema-engine/forms/lib/standard-schema`) for callers that prefer a tagged result over a thrown error.
4. **Consumers** may register custom elements with a hand-written Standard Schema — they are not required to install Zod unless they use Zod-authored built-ins.

Form authors supply schema **input** (defaults stay optional). After `defineForm` / `validateForm`, components receive schema **output**. Nested container `elements` are authored against the same engine registrations as top-level fields.

### Proof test

`packages/forms/test/lib/standard-schema-engine.test.ts` registers a native Standard Schema element, builds a FormEngine, and runs `defineForm`. Renderer packages exercise the same registration through `FormRenderer`.

## Radiant form state

Radiant UI's form store owns control registration, values, validation, and field
presentation. It publishes that store on `formContext`. `@schema-engine/forms-radiant`
exposes scoped `FormController` instances that read `formContext` from a host
inside `rui-form`; there is no global active form store. They read
`formContext.store` instead of a private host field. Decorators are
optional lifecycle wiring around that controller.
Radiant UI registration uses flat dotted field names. Controller reads, action
context values, constraints, and submission use the engine's nested value tree.
See [the controller contract](./packages/forms-radiant/src/adapters/radiant/controller/README.md).

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
the longhands in the generated rule and would reset them.
