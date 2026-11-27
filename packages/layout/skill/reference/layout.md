# @schema-engine/layout

Domain-neutral layout: the grid, the appearance axes and the theme that compiles both. It knows nothing about forms, so any container of items can use it; the forms engine takes a theme as `layout`. The terms are defined in the router (`SKILL.md`).

## One theme

`createLayoutTheme({ grid, appearance }, { reservedNames? })` compiles the grid vocabulary and the appearance axes once into a frozen theme: `id` (the value of `data-se-theme`), `css` (one stylesheet scoped by `[data-se-theme="<id>"]`), `grid`, `axes` (axis name to its values) and `appearance` (the axes as a read-only registry). Options that describe the same theme give the same id, so two engines built from equal options share a stylesheet; pass one compiled theme to several consumers to make them carry the same `data-se-theme`. `getDefaultLayoutTheme()` is the shared default and `isLayoutTheme(value)` tells a theme from options for one.

An engine takes either one as its `layout` (`LayoutInput`). `createLayoutTheme` refuses an axis named in `reservedNames`; a theme compiled elsewhere skips that check, so an engine runs `assertAxesNotReserved(theme, reservedNames)` on a theme it is given, which throws the same way. Every layout check returns `LayoutIssue`s, `{ message, path }`, with the path relative to the thing checked.

```ts title="layout/theme.ts"
import {
	builtInAxes,
	createLayoutTheme,
	defineAxis,
	getAppearanceAttributes,
	getGridVariables,
	mergeAppearance,
} from '@schema-engine/layout';

const tone = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone' },
	default: 'neutral',
	values: { neutral: {}, brand: { '--se-accent': '#f60' } },
});

export const theme = createLayoutTheme({
	grid: { breakpoints: { md: '50rem' }, gap: { default: '1rem' } },
	appearance: [...builtInAxes, tone],
});

export const attributes = getAppearanceAttributes(mergeAppearance({ size: 'compact' }, { tone: 'brand' }));

export const containerStyle = getGridVariables({ columns: 2 }, theme.grid, []);
```

## Appearance axes

An axis is one independent dimension of appearance with 2 to 5 named values, each a set of semantic CSS tokens (`--` keys) that components read; components never read the value itself. `defineAxis({ $type, values, default, metadata })` builds one and throws on a bad name, a bad value count, a token that is not a custom property or a `default` that is not a value. `builtInAxes` is `size` (`compact`, `default`, `comfortable`) and `surface` (`flat`, `outlined`, `elevated`); axes are registrations, so a later axis of the same `$type` replaces the earlier one, and a list without `builtInAxes` has neither. An axis becomes a `data-se-<axis>` attribute, so a domain passes the attribute names it already writes as `reservedNames`.

An axis is for a look an author picks among a few. A value that every entity of a domain has for itself (a colour per machine, per brand, per tenant) is domain data, so it is not an axis, and `defineAxis` refuses more than five values. Write the domain's own attribute from the data (`data-machine="sampler"`, never a `data-se-*` name, which the renderers own), and have the host stylesheet map each value to the semantic tokens that components already read (`[data-machine="sampler"] { --primary: #e4572e; }`), generated from the same data. An axis value may read such a token (`'--se-surface-background': 'color-mix(in srgb, var(--primary) 12%, transparent)'`), so the pick stays a choice among a few looks while the colour stays the entity's. Choose an axis when an author picks among 2 to 5 looks, and identity tokens when every entity has its own value.

The pure helpers: `checkAppearance(authored, options)` validates a pick, `mergeAppearance(inherited, own)` lays a child over its parent, `pickSupportedAppearance(picks, axes)` keeps what an owner supports and `getAppearanceAttributes(selection)` produces the `data-se-*` attributes. Walking a document to inherit picks belongs to each domain. `createAppearanceSchema(registry, supported?)` is the closed schema of a pick, for JSON Schema export, and `AppearanceConfigSchema` the open one (axis name to value). `withAppearanceAxes(schema, axes, supported?)` sets the `appearance` key of an object schema to the closed schema, and `withSlotAppearanceAxes(schema, axes, slotAxes?)` does it for each slot of a recipe's view schema. Both are for the export only: parse with the original schema.

## Grid

A grid container takes `columns`, `gap`, `gapX`, `gapY`, `areas`, alignment and a `responsive` map by breakpoint; a container also takes `autoFlow` (`'row'` or `'dense'`, top level only); an item takes `width`, `offset`, `span`, `area`, `column`, `row`, self-alignment and block margins, and a `responsive` map by breakpoint that can also set `hidden`. `getGridVariables(grid, theme.grid, items)` and `getGridItemVariables(item.grid)` return records of `--se-grid-*` and `--se-item-*` custom properties that fit a React `style` and a plain `style` object. A renderer puts `GRID_CLASS` on every container, `GRID_ITEM_CLASS` on every item and `data-se-theme="<id>"` on both; the stylesheet selects only those hooks.

Breakpoints measure the window by default (`@media`). `createLayoutTheme({ grid: { query: 'container' } })` makes the same breakpoints, gap ramps and cascade measure the grid's own wrapper (`@container se-grid`), for a grid in a card, sidebar or panel; the document does not change, only the theme. The wrapper is an element with `GRID_CONTAINER_CLASS` and `data-se-theme="<id>"` around each grid, nested grids included, because a grid and its items must query one box and an element cannot query its own size. The forms renderers add it only in container mode. A grid with no wrapper keeps its narrowest layout. The wrapper has inline-size containment: it collapses in a shrink-to-fit parent, contains `position: fixed` descendants, and an `em` breakpoint resolves against its font size. The two modes are different themes with different ids.

`grid: { subgrid: true }` on an item makes it span its parent's full row (`1 / -1`) and lay its own children on the parent's column tracks and gap, so nested fields line up with the fields around them. It is top level only, never in `responsive`, and the item may not set `width`, `offset`, `span`, `column`, `area`, `justifySelf` or `placeSelf` (`subgridPlacementIssue` reports the key). Put `GRID_SUBGRID_CLASS` and `data-se-theme` on the item, on every box between it and the inner grid, and on the inner `GRID_CLASS` grid, which gets no inline track variables and no `GRID_CONTAINER_CLASS` wrapper; a box that is not a subgrid, or that has `container-type`, silently makes the children one column. Keep a `<fieldset>` out of the chain, because Chromium does not make one a subgrid: use a `div` with `role="group"` and `aria-labelledby` its heading. In a renderer's DOM test, `findSubgridChainBreaks(root)` from `@schema-engine/layout/testing` (an entry apart from the main one, which has no DOM types) returns one sentence per break in the chain of each subgrid under `root`: a box between it and its grid without the class, a subgrid without `data-se-theme`, or a subgrid with no grid above it. The walk up is not bounded by `root`. `expect(findSubgridChainBreaks(container)).toEqual([])` fails with the offending `div.wrapper` named. Pass the children of every subgrid among the items you give `getGridVariables`, so the parent gets 12 tracks when they use `width`. The edge fields are inset by the item's border and padding; interior lines match exactly.

`span: n` (a positive integer, top level or per breakpoint) sizes an item in tracks and never past the grid's own: it compiles to `span min(n, var(--se-grid-track-count, 1))`. The grid publishes the count it draws as `--se-grid-tracks[-slot]` (`getGridVariables` writes it beside every template: `columns: n` gives `n`, named widths 12, `areas` the row length), the stylesheet resolves it through the same gated cascade as the template, so the clamp switches at the width the tracks do, in a media theme and in a container theme, and a subgrid inherits the resolved count of its parent grid. An item and the grid it contains must be different elements. `columns: 'auto'` has no countable tracks in CSS: a span there is one track, and `gridSpanIssues(grid, elements)` reports it (the path starts with the element's index) so a domain rejects it; give the grid `columns` per breakpoint instead, with a container theme. `spanPlacementIssue(element)` reports a `span` that shares a slot with `width`, `offset`, `column` or `area`. `autoFlow: 'dense'` backfills earlier gaps with later, smaller items; it changes visual order, not DOM or focus order. There is no `width: 'auto'`: content sizing is `columns: 'auto'` with `minColumnWidth`.

The grid keys are Zod Mini schemas, each with the type inferred from it: `GridLayoutConfigSchema` for a container's `grid`, `GridBreakpointConfigSchema` for one breakpoint of it, `ElementGridConfigSchema` for an item's `grid` and `ItemGridBreakpointSchema` for one breakpoint of that. The names are exported as lists: `GridGapTokens` (`none`, `compact`, `default`, `loose`, `wide`), `GridWidthNames` (`full`, `three-quarters`, `two-thirds`, `half`, `third`, `quarter`) and `GridOffsetNames` (the widths without `full`). A named width or offset is a share of `WIDTH_TRACKS` (12) tracks, and the keys in `GRID_TEMPLATE_KEYS` (`columns`, `minColumnWidth`) define a template, so they cannot meet named widths.

A domain that validates elements reads their grid with pure checks that take an element or a grid as `unknown`, so they run before any schema has parsed it.

- `elementGridKeys(element)` is the set of `grid` keys an element sets, at the top level or in any breakpoint. `elementUsesGridWidths(element)` is whether it sets `width` or `offset`, and `elementIsSubgrid(element)` whether it sets `subgrid: true`.
- `namedPlacementOverflow(element)` is the first slot where `offset` and `width` together pass the 12 tracks, `{ slot, tracks }`, or `undefined`. Two slots that each look valid can overflow together, because each carries the other's value up the cascade.
- `gridAreaTemplates(grid)` is the `areas` templates by slot, each a list of rows of cells, `gridUsesAreas(grid)` is whether there are any, `areaNames(rows)` the names a template uses and `areaTemplateIssues(grid)` the reasons CSS would drop one: rows of unequal length, or an area that is not a rectangle. `elementAreaSlots(element)` is the area an element sets at each slot and `elementHiddenSlots(element)` the `hidden` it sets at each.
- `cascadeValues(authored)` resolves a value set at some slots (`default` or a breakpoint name) to what every slot gets: its own value, else the last one a narrower slot set, the fallback the stylesheet emits.

## Recipe protocol

A recipe composes named slots into a view. `defineRecipeProtocol({ slots, kinds, rules? })` declares a domain's slots (in composition order) and kinds once. Each rule is `{ name, check(recipe) }`: `check` reads the recipe's `$type`, `kind` and `slots` and returns a phrase that says what is wrong, or `undefined` when the recipe passes. `assertRecipeRules(protocol, recipe)` throws for a kind or slot the protocol does not declare and for a rule that fails (`Recipe 'x' breaks rule 'name': <phrase>.`); `defineProtocolRecipeSpec` and `createRecipeRegistry` run it, so a hand-written recipe is checked too. `defineProtocolRecipeSpec`, `bindRecipe` and `createRecipeRegistry` build the recipes of that protocol. Forms is the first protocol, and nothing in the contract is form-specific. A spec's `slotSchemas` take any Standard Schema that validates synchronously (Zod Mini, Valibot or one you write), and `spec.schema` is a Standard Schema, not a Zod one: validate it with `safeParseStandardSchema` (`@schema-engine/registry`). A slot that declares `appearanceAxes` must take an `appearance` key in its schema input, which the types check. `bindRecipe` keeps the slot schemas on the registration as `slotSchemas`, which `createRecipeRegistry` checks against the recipe's `slots`.

## Recipes outside forms

The recipe holds the shell and the config of each slot: the slot schemas, `slotDefaults` and `appearanceAxes`, plus a render payload that `bindRecipe` attaches (a React component for one renderer, a Radiant one for another; the package never reads it). The document holds which recipe it takes, as a `view` (the recipe's `$type` and the config of its slots), and the content of the slots, which is plain data the recipe does not read. `resolveRecipeView(recipe, view, { axes, inherited })` lays the recipe's defaults under the view, resolves each slot's appearance and parses the result, returning `{ issues, view }` or `{ issues, schemaIssues }`; `readSlotConfig(view, slot, schema)` reads one slot of a resolved view, typed by `schema` without parsing again. `mergeSlotDefaults(view, slotDefaults)` is the first step on its own: a view's slots laid over the defaults, deep for plain objects, while an array or other value replaces the default whole. `RecipeViewModel` (`kind` and the resolved `viewConfig`) is what every recipe renderer receives, and a domain extends it. The same spec bound twice, once for each renderer, draws the same document in both.

```ts title="layout/card-recipe.ts"
import * as v from 'valibot';
import {
	bindRecipe,
	createRecipeRegistry,
	defineProtocolRecipeSpec,
	defineRecipeProtocol,
	getDefaultLayoutTheme,
	readSlotConfig,
	resolveRecipeView,
} from '@schema-engine/layout';

export const cardProtocol = defineRecipeProtocol({
	slots: ['shell', 'header', 'body', 'footer'],
	kinds: ['card'],
});

export const cardSpec = defineProtocolRecipeSpec(cardProtocol, {
	$type: 'card',
	kind: 'card',
	metadata: { name: 'Card' },
	slotSchemas: {
		shell: v.strictObject({ appearance: v.optional(v.record(v.string(), v.string())) }),
		header: v.strictObject({ level: v.optional(v.picklist([1, 2, 3, 4, 5, 6]), 2) }),
		body: v.strictObject({ gap: v.optional(v.picklist(['sm', 'md']), 'md') }),
		footer: v.strictObject({ align: v.optional(v.picklist(['start', 'end']), 'start') }),
	},
	slotDefaults: { header: { level: 3 } },
	appearanceAxes: { shell: ['size', 'surface'] },
});

export const recipes = createRecipeRegistry(cardProtocol, [bindRecipe(cardSpec, { tag: 'article' })]);

const recipe = recipes.get('card')!;
const scope = { axes: getDefaultLayoutTheme().axes, inherited: {} };

export const resolved = resolveRecipeView(
	recipe,
	{ $type: 'card', shell: { appearance: { surface: 'outlined' } }, footer: { align: 'end' } },
	scope,
);

export const undeclared = resolveRecipeView(recipe, { $type: 'card', aside: {} }, scope);

export const footer = resolved.view && readSlotConfig(resolved.view, 'footer', cardSpec.slotSchemas.footer);
```
