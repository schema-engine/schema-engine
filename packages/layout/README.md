# @schema-engine/layout

Domain-neutral layout for Schema Engine: the grid schemas and compiler, named placement, the appearance axes, `createLayoutTheme`, which compiles grid and appearance into one theme, and the recipe protocol that lets a domain declare the slots and kinds of its view recipes.

It knows nothing about forms and does not depend on `@schema-engine/forms`. `@schema-engine/forms` and its renderers build on it, and any other domain that places items in a container can reuse the same rules.

## Installation

```bash
pnpm add @schema-engine/layout zod
```

The grid, axis and recipe schemas use `zod/mini`, so `zod` is a peer dependency. Axes and the recipe registry are stored with `@schema-engine/registry`, which is installed with this package.

## One theme

`createLayoutTheme({ grid, appearance }, { reservedNames })` compiles both vocabularies once into a frozen theme:

- `id`: one identity for the whole theme, the value of the `data-se-theme` attribute.
- `css`: one stylesheet, scoped by `[data-se-theme="<id>"]`.
- `grid`: the resolved grid vocabulary, which the emitters read.
- `axes`: appearance axis name to its closed value list.
- `appearance`: the axes as registrations, in a read-only registry (`@schema-engine/registry`): values, tokens, default and metadata.

```ts
import { builtInAxes, createLayoutTheme, defineAxis } from '@schema-engine/layout';

const tone = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone' },
	default: 'neutral',
	values: { neutral: {}, brand: { '--se-accent': '#f60' } },
});

const theme = createLayoutTheme({
	grid: {
		breakpoints: { md: '50rem' },
		gap: { default: '1rem', loose: '1.5rem' },
		responsive: { lg: { default: '1.5rem' } },
	},
	appearance: [...builtInAxes, tone],
});
```

Options that describe the same theme give the same id, whatever order the grid's responsive entries were written in, so two engines built from equal options share a stylesheet. Axis, value and token order is part of the identity. Compile once and pass the theme to several consumers to make them carry the same `data-se-theme`. With the forms engine:

```ts
import { createFormEngine } from '@schema-engine/forms';

const checkout = createFormEngine({ elements, layout: theme });
const profile = createFormEngine({ elements, layout: theme });
```

`isLayoutTheme(value)` tells a compiled theme from options for one, and `getDefaultLayoutTheme()` is the shared library default.

### Reserved axis names

An appearance axis becomes a `data-se-<axis>` attribute, so it must not reuse an attribute a renderer already writes. The compiler hard-codes none: each domain passes its own as `reservedNames`, and `assertAxesNotReserved(theme, reservedNames)` re-checks a theme compiled elsewhere.

```ts
// `step` is an axis defined with `defineAxis({ $type: 'step', ... })`.
createLayoutTheme({ appearance: [...builtInAxes, step] }, { reservedNames: ['step'] }); // throws
```

## Appearance axes

An appearance axis is one independent dimension of appearance, with 2 to 5 named values. Each value stands for a set of semantic CSS tokens, which components read. Components never read an axis value. The theme declares the axes, a registration declares which axes it responds to, and a document picks values that pass down.

`defineAxis({ $type, values, default, metadata })` builds an axis:

- `$type` is the axis name and the `data-se-<axis>` attribute.
- `values` maps each value name to its tokens (`--` keys only). A token set to `initial` hands the token back to the component's own fallback.
- `default` names the value that stands for no pick. It must be one of `values`.
- `metadata` is the name and description a catalog or an editor shows.

`defineAxis` also produces the axis's Standard Schema (an enum of the value names), because the registry requires one. It throws on a bad name, fewer than 2 or more than 5 values, a value that would break a selector, a token that is not a custom property, or a `default` that is not a value.

`builtInAxes` is the default list: `size` (`compact`, `default`, `comfortable`) sets `--se-space`, `--se-font-size` and `--se-measure` (the readable width of a text block, a column or a card); `surface` (`flat`, `outlined`, `elevated`) sets `--se-border-width`, `--se-shadow` and `--se-surface-background`. The tokens are renderer-neutral and name no host theme. `size.default`, the whole of `surface.elevated` and the background of `flat` and `outlined` are `initial`, which hands the token back to the component's own fallback, so a renderer's fallbacks, mapped to its host theme, stay in force and a `default` or `elevated` pick looks like no pick, also inside a `compact` form. `compact` and `comfortable` spacing are hooks, `var(--se-space-compact, 1rem)` and `var(--se-space-comfortable, 2rem)`: a renderer maps them to its theme spacing (Radiant sets them from `--space-block` and `--space-block-xl`). Keep a host axis list inline in `createLayoutTheme`, or write it `as const`, so the values stay literal types.

`createLayoutTheme({ appearance: [...builtInAxes, myAxis] })` builds the axes into a registry: the last axis of a `$type` wins, so listing a `size` axis after the built-ins overrides it. A list without `builtInAxes` has no `size` or `surface`.

Rules for a good axis: orthogonal to the others; the same meaning on every component, so tokens name a role and never a component (a card's width is the card's own CSS, not a token); a small closed set of named values; appearance only, never structure.

`createAppearanceSchema(registry)` builds the schema of a pick from the theme's axes: each axis an optional enum of its values, which a JSON Schema export lists.

### Nested themes

Every grid and item carries `data-se-theme`, so a form of theme B rendered inside a grid item of theme A has both themes above it. The token rules do not leak between them: with `T` the theme's `[data-se-theme="<id>"]` and `O` any other theme, `[data-se-theme]:not(T)`, each is written as `:where(T[data-se-x="v"], T [data-se-x="v"]:not(O, T O *))`, so an element takes the tokens of the nearest theme, whichever stylesheet comes later. A pick made on the element that carries the theme, or below it with no other theme in between, uses that theme's tokens. The rules stay in `:where()`, so they add no specificity and an author's class still wins. The grid rules are unchanged.

Plain selectors cannot say "no other theme between" for a theme re-entered below another theme (A inside B inside A): the descendants of the inner A match no plain rule, so they inherit the custom properties of the nearest element that did, which can be a wrong token. The stylesheet therefore also carries, after the plain rules, one `@scope (T) to (O) { :where(:scope[data-se-x="v"], [data-se-x="v"]) { ... } }` per token rule. A browser without `@scope` (it is Baseline since late 2025) drops those blocks and keeps the plain rules, which are right for every case but A in B in A. A browser with it is exact for all of them. Neither needs a script, and both hold in server-rendered output. The `@scope` rules add about 1.4 KB to a theme with the built-in axes.

`@scope` changes one cascade detail: scope proximity outranks source order, and an unscoped rule is the farthest from any scope root. A zero-specificity author rule such as `:where(.x)` therefore loses to a token rule in a browser with `@scope`, where it won on order alone before. A class with any specificity still wins.

Tokens are custom properties, so they still inherit like any other: an outer pick on an axis reaches a nested form that picks nothing on that axis, until that form picks a value that declares those tokens (the built-in `size.default` and `surface.elevated` set theirs to `initial`, which hands them back to the component).

## The stylesheet hooks

The stylesheet selects only `.se-grid`, `.se-grid-item` and `[data-se-theme]`. A renderer puts `GRID_CLASS` (`se-grid`) on every grid container, `GRID_ITEM_CLASS` (`se-grid-item`) on every item placed in one, and `data-se-theme="<id>"` on both. It adds them beside its own classes. There are no aliases for another class name.

An item's placement travels as `--se-item-*` custom properties (`--se-item-grid-column`, `--se-item-display`, `--se-item-margin-block-end` and the rest, each with a `-<breakpoint>` variant). A host that needs its own `display` sets `--se-item-display-mode` instead, which the stylesheet's responsive `hidden` toggles against. Container properties are `--se-grid-*`.

The stylesheet owns behavior: neutral defaults, the breakpoint cascade, and the `initial` resets that keep a nested grid from inheriting its parent's placement. Inline custom properties carry only values an author wrote, so an element without `grid` config has no `style` attribute.

## Emitting a container and its items

```ts
import { GRID_CLASS, GRID_ITEM_CLASS, getGridItemVariables, getGridVariables } from '@schema-engine/layout';

// The container: `grid` is the author's GridLayoutConfig, `items` the elements it places.
const containerStyle = getGridVariables(grid, theme.grid, items);

// Each item: its own ElementGridConfig.
const itemStyle = getGridItemVariables(item.grid);
```

Both return a record of `--*` custom properties that is assignable to React `CSSProperties` and to a plain `style` object. `getGridVariables` gives a container 12 tracks and a `1 / -1` default placement when its items use named widths, and the template of its `areas` when it draws a layout.

## Appearance helpers

Walking a document tree to inherit picks belongs to each domain, because only it knows the tree's shape. The pure steps are here:

| Function                               | Does                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `checkAppearance(authored, options)`   | Checks a pick against the vocabulary and the owner's axes; each issue is a `LayoutIssue` at `['appearance', axis]` |
| `mergeAppearance(inherited, own)`      | Lays a child's pick over the pick it inherits                                                                      |
| `pickSupportedAppearance(picks, axes)` | Keeps the axes an owner supports                                                                                   |
| `getAppearanceAttributes(selection)`   | Produces the `data-se-<axis>` attributes a renderer spreads                                                        |

`AppearanceConfigSchema` is the open schema of a pick (`{ size: 'compact' }`); `createAppearanceSchema` is the one closed over a theme's axes.

## Recipe protocol

A recipe composes slots (shell, header, content, ...) into a view. The spec, binding, slot defaults and resolved view are the same for every domain, so they live here; each domain declares the slots, kinds and rules its recipes use, once:

```ts
import * as z from 'zod/mini';
import {
	AppearanceConfigSchema,
	bindRecipe,
	createRecipeRegistry,
	defineRecipeProtocol,
	defineProtocolRecipeSpec,
} from '@schema-engine/layout';

const sectionProtocol = defineRecipeProtocol({
	slots: ['shell', 'media', 'content'],
	kinds: ['section'],
	rules: [
		{
			name: 'section-needs-content',
			check: (recipe) =>
				recipe.slots.includes('content') ? undefined : `kind 'section' must declare a content slot`,
		},
	],
});

const ContentConfigSchema = z.object({ columns: z.optional(z.number()) });
const MediaConfigSchema = z.object({ ratio: z.optional(z.string()), appearance: z.optional(AppearanceConfigSchema) });

const hero = defineProtocolRecipeSpec(sectionProtocol, {
	$type: 'hero',
	kind: 'section',
	metadata: { name: 'Hero' },
	slotSchemas: { media: MediaConfigSchema, content: ContentConfigSchema },
	slotDefaults: { content: { columns: 2 } },
	appearanceAxes: { media: ['size'] },
});

// `render` is whatever your renderers need; this package never reads it.
const registry = createRecipeRegistry(sectionProtocol, [bindRecipe(hero, { shell: HeroShell })]);
```

- `slots` is ordered: a spec lists the slots it declares in that order. A slot or kind outside the protocol is a type error in `defineProtocolRecipeSpec` (including `slotDefaults` and `appearanceAxes` keys) and a thrown error for a hand-written registration.
- A rule's `check` returns the problem, or `undefined`. A failure reads `Recipe 'hero' breaks rule 'section-needs-content': ...`.
- Rules run in `defineProtocolRecipeSpec` and, in `createRecipeRegistry`, on each winning registration of a `$type` (a recipe overridden later in the list is skipped). The registry is the read-only one from `@schema-engine/registry`.
- `defineProtocolRecipeSpec` checks `slotDefaults` against the slot schemas and requires a slot that declares `appearanceAxes` to accept an `appearance` key. It keeps the concrete view schema type, so a domain can infer the authoring type of a view from a registration.
- The protocol types are `RecipeProtocol`, `RecipeRule` and `RecipeShape` (what a rule reads), with `SlotOf` and `KindOf` to get the names back from a protocol, and `ProtocolRecipeSpec` and `ProtocolRecipeRegistration` for the spec and its binding. These carry the `Protocol` prefix because `@schema-engine/forms` exports narrower `RecipeSpec` and `RecipeRegistration` types of its own. `assertRecipeRules(protocol, recipe)` is the check both entry points run, for a domain that validates a recipe outside a registry.
- `resolveRecipeView(recipe, view, scope)` resolves the view a document selects, for a winning registration: the recipe defaults laid under the author's slot config, each slot's `appearance` (the scope's inherited picks for the axes the slot declares, the slot's own pick winning, invalid picks reported at `[slot, 'appearance', axis]`), the schema parse, and any key the recipe does not declare. It returns `{ issues, view }`, or `{ issues, schemaIssues }` when the schema rejects the view, so the domain formats schema issues its own way. Each of `issues` is a `LayoutIssue`, `{ message, path }`, with a path relative to the view that the domain lays under the view's own location. It does not change the view it is given. What needs the whole document (a kind that wants a number of steps, a default recipe) stays with the domain.
- `mergeSlotDefaults(view, slotDefaults)` lays a view's slot config over the recipe defaults, deep for plain objects. `readSlotConfig(viewConfig, slot, schema)` reads one slot of a resolved view, and `RecipeViewModel` is the part of a renderer's view model that every domain shares.

The render payload is opaque here: `bindRecipe(spec, render)` stores whatever a domain's renderers need. Forms declares its protocol in [`@schema-engine/forms/recipes`](../forms/README.md); the built-in form recipes stay there.

## Grid schemas

`GridLayoutConfigSchema` (a container's `grid`) and `ElementGridConfigSchema` (an item's `grid`) are Zod Mini schemas, with `GridLayoutConfig` and `ElementGridConfig` as their inferred types. `ItemGridBreakpointSchema` is the schema of one breakpoint entry of an item's `responsive` map, and `GridBreakpointConfigSchema` the container's. The gap tokens (`GridGapTokens`) and the named widths and offsets (`GridWidthNames`, `GridOffsetNames`) are exported too. Area names are checked by a pattern that the JSON Schema export carries. Placement helpers used by validators (`namedPlacementOverflow`, `gridAreaTemplates`, `areaTemplateIssues`, and the cascade helpers) are exported too.

## Public surface

The package has one entry, `@schema-engine/layout`, and every export is named: nothing is re-exported with `export *`, so adding a function to a module does not widen the API. `test/public-surface.test.ts` lists the runtime exports. `test/types/public-surface.test-d.ts` pins that the listed types stay exported and the internal ones do not; it is checked by `check-types`, not by `test:all`. A change to either list is a change to the API.

| Area            | Exports                                                                                                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme           | `createLayoutTheme`, `getDefaultLayoutTheme`, `isLayoutTheme`, `assertAxesNotReserved`, and the types `LayoutTheme`, `LayoutThemeOptions`, `LayoutThemeCompilerOptions`, `LayoutInput`, `LayoutAxes`                                           |
| Appearance      | `defineAxis`, `builtInAxes`, `createAppearanceSchema`, `AppearanceConfigSchema`, `checkAppearance`, `mergeAppearance`, `pickSupportedAppearance`, `getAppearanceAttributes`, and the axis and pick types                                       |
| Grid schemas    | `GridLayoutConfigSchema`, `ElementGridConfigSchema`, `GridBreakpointConfigSchema`, `ItemGridBreakpointSchema`, `GridGapTokens`, `GridWidthNames`, `GridOffsetNames`, and their types                                                           |
| Grid emitters   | `GRID_CLASS`, `GRID_ITEM_CLASS`, `getGridVariables`, `getGridItemVariables`, `CssVariables`, `GridThemeOptions`, `NormalizedGridTheme`, `GridGapScale`                                                                                         |
| Grid placement  | `namedPlacementOverflow`, `gridAreaTemplates`, `gridUsesAreas`, `areaNames`, `areaTemplateIssues`, `cascadeValues`, `elementAreaSlots`, `elementGridKeys`, `elementHiddenSlots`, `elementUsesGridWidths`, `GRID_TEMPLATE_KEYS`, `WIDTH_TRACKS` |
| Recipe protocol | `defineRecipeProtocol`, `defineProtocolRecipeSpec`, `bindRecipe`, `createRecipeRegistry`, `assertRecipeRules`, `resolveRecipeView`, `mergeSlotDefaults`, `readSlotConfig`, and the protocol and view types                                     |

Left internal on purpose: `compileAppearance`, `getAppearanceCss`, `resolveGridTheme`, `getGridThemeCss` and `canonicalGridTheme` (a theme is the one way to get a stylesheet, and `theme.appearance` and `theme.grid` already expose what they compile), `assertAxisNotReserved` (`createLayoutTheme` and `assertAxesNotReserved` run it), the `DeepReadonly`, `CompiledAppearance` and `NamedPlacement` types, and the cascade tables (`BREAKPOINT_ORDER`, `CASCADE_SLOTS`, `WIDTH_SPANS`). `readSlotConfig` takes any slot name. `@schema-engine/forms/recipes` exports `getSlotConfig`, typed by the forms slots, which a forms renderer should use so a slot typo fails to compile; the names differ so an auto-import cannot pick the loose one by mistake.

## Tests

`pnpm --filter @schema-engine/layout test:all` runs the grid compiler, placement, theme, appearance and recipe protocol unit tests. The renderer packages run the shared acceptance harnesses in `test-utils/` against this package's output.
