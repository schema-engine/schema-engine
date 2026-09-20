# @schema-engine/forms-radiant

Radiant/JSX adapter for the Schema Engine form system.

## Why the recipe components ship in this package

Unlike `@schema-engine/forms-react` — where the default view recipes live in the shadcn registry and consumers register them explicitly with `createFormEngine({ recipes })` — Radiant has no registry ecosystem to lean on. The shells and step blocks are therefore part of this package and `createRadiantFormEngine()` binds the canonical recipes automatically, so the package stays plug-and-play. The recipe specs themselves remain canonical in `@schema-engine/forms/recipes`.

## Install

```bash
pnpm add @schema-engine/forms-radiant @schema-engine/forms @ecopages/radiant-ui @ecopages/radiant @ecopages/jsx @ecopages/signals zod
```

Load Tailwind preflight (via Radiant core), theme, and component styles:

```ts
import '@ecopages/radiant-ui/radiant-ui-core.css';
import '@ecopages/radiant-ui/themes/default';
import '@ecopages/radiant-ui/styles.css';
```

`@schema-engine/forms-radiant` already imports `radiant-ui-core.css` from source. Apps that load the compiled package should import the emitted stylesheet — published JS does not execute CSS:

```ts
import '@schema-engine/forms-radiant/index.css';
```

That file includes host display rules and first-party shell/field CSS. Apps that load component CSS without the package root still need the core (or their own Tailwind preflight) so headings, lists, and form controls are not left on user-agent margins.

First-party schemas use the functional `zod/mini` API. Install the `zod` package when authoring schemas; registrations supplied by consumers may use any Standard Schema implementation, including Valibot, Effect Schema, or Zod.

## Quick start

```ts
import { createRadiantFormEngine, FormRenderer, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { radiantAdapter } from '@schema-engine/forms-radiant/adapters/radiant';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

<FormRenderer engine={engine} adapter={radiantAdapter} config={formConfig} onSubmit={handleSubmit} />;
```

`engine` and `adapter` are `@state` (JS only). `@prop({ type: Object })` would stringify them onto the host tag.

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

- Every step's fields are authored once inside `se-form-step`; hosts toggle their own `hidden` attribute from the step state, so SSR emits the full form and step switching is pure DOM.
- Conditional fields with constraints are wrapped in a plain `.se-form-constraint` container with `data-se-constraint-field`. `se-form-instance` listens to the form store and toggles `hidden` and the field's `disabled` reactively, without separate custom element wrappers or serialized JSON configs. It reads the rendered `data-se-constraint-field` values rather than building selectors from the config, so each row of an array resolves its own siblings. Constraint `require` updates the live `FieldRules` object (so `validate` functions and `RegExp` patterns survive) and toggles `[data-se-required-marker]` on the label.
- Recipe chrome blocks read serializable `config` / `viewConfig` props plus the live `formInstanceContext`; where SSR cannot resolve context (authored children serialize before providers publish), they fall back to the initial step-0 state and hydrate the live values.
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
	return jsx('se-form-instance', { config, 'prop:engine': engine, children: … });
}
```

The split is a bundle boundary, not a filing preference. The view is evaluated
at build time to produce HTML and never reaches the browser; the script is the
only part that ships. A component with no behavior therefore has no `.script`
file and costs a page nothing, which is why `heading` and `chip` in radiant-ui
are view-only.

The re-export is what carries the registration at the source level: without it,
a view that only named `'se-form-instance'` as a string literal would have no
reference to the script module at all. It does not by itself survive a
consumer's bundler, though — this package's published output still needs its
own `sideEffects` accounting, tracked separately from this split.
`internals/form-renderer.script.tsx` is the same shape.

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
registration, validation, and error presentation.

The controller provides snapshot reads, live watches with cleanup, field bindings,
and array mutations with stable row IDs. See the [controller API and migration
guide](./src/adapters/radiant/controller/README.md) for examples and the replacement
for the removed snapshot hooks.

Field schemas live beside each registration under `src/elements/` (for example `form-input.types.ts` next to `form-input.registration.ts`). Component props stay on the widget modules. Radiant does not ship `date` or `date-range` widgets; those `$type`s exist only in the shadcn registry today. Registry and Radiant schemas may diverge where capabilities differ.

## Development

```bash
pnpm build:lib
pnpm test:all
pnpm storybook   # port 6007
```

From monorepo root: `pnpm dev:radiant-storybook`.

Stories default to **client** render. Use the Storybook toolbar **Radiant render** control to spot-check `ssr-hydrate` and `ssr-static` on any story — same contract as radiant-ui. Play functions skip `ssr-static` (markup-only iframe, no client module). SSR layout acceptance renders the real `RecipeRenderer` through `renderToString`: `test/ssr/grid-layout-ssr.markup.test.ts` checks the emitted stylesheet and field variables, and `test/ssr/grid-layout-ssr.acceptance.browser.test.ts` loads that HTML in an isolated iframe without app JS and checks layout at two widths. Both share `test-utils/` with the React package.
