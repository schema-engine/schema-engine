# @schema-engine/layout

Domain-neutral layout: the grid, the appearance axes and the theme that compiles both. It knows nothing about forms, so any container of items can use it; the forms engine takes a theme as `layout`. The terms are defined in the router (`SKILL.md`).

## One theme

`createLayoutTheme({ grid, appearance }, { reservedNames? })` compiles the grid vocabulary and the appearance axes once into a frozen theme: `id` (the value of `data-se-theme`), `css` (one stylesheet scoped by `[data-se-theme="<id>"]`), `grid`, `axes` (axis name to its values) and `appearance` (the axes as a read-only registry). Options that describe the same theme give the same id, so two engines built from equal options share a stylesheet; pass one compiled theme to several consumers to make them carry the same `data-se-theme`. `getDefaultLayoutTheme()` is the shared default and `isLayoutTheme(value)` tells a theme from options for one.

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

The pure helpers: `checkAppearance(authored, options)` validates a pick, `mergeAppearance(inherited, own)` lays a child over its parent, `pickSupportedAppearance(picks, axes)` keeps what an owner supports and `getAppearanceAttributes(selection)` produces the `data-se-*` attributes. Walking a document to inherit picks belongs to each domain. `createAppearanceSchema(registry)` is the closed schema of a pick, for JSON Schema export.

## Grid

A grid container takes `columns`, `gap`, `gapX`, `gapY`, `areas`, alignment and a `responsive` map by breakpoint; an item takes `width`, `offset`, `area`, `column`, `row`, self-alignment and block margins, and a `responsive` map by breakpoint that can also set `hidden`. `getGridVariables(grid, theme.grid, items)` and `getGridItemVariables(item.grid)` return records of `--se-grid-*` and `--se-item-*` custom properties that fit a React `style` and a plain `style` object. A renderer puts `GRID_CLASS` on every container, `GRID_ITEM_CLASS` on every item and `data-se-theme="<id>"` on both; the stylesheet selects only those hooks.

Breakpoints measure the window by default (`@media`). `createLayoutTheme({ grid: { query: 'container' } })` makes the same breakpoints, gap ramps and cascade measure the grid's own wrapper (`@container se-grid`), for a grid in a card, sidebar or panel; the document does not change, only the theme. The wrapper is an element with `GRID_CONTAINER_CLASS` and `data-se-theme="<id>"` around each grid, nested grids included, because a grid and its items must query one box and an element cannot query its own size. The forms renderers add it only in container mode. A grid with no wrapper keeps its narrowest layout. The wrapper has inline-size containment: it collapses in a shrink-to-fit parent, contains `position: fixed` descendants, and an `em` breakpoint resolves against its font size. The two modes are different themes with different ids.

## Recipe protocol

A recipe composes named slots into a view. `defineRecipeProtocol` declares a domain's slots and kinds once; `defineProtocolRecipeSpec`, `bindRecipe` and `createRecipeRegistry` build the recipes of that protocol. Forms is the first protocol. A spec's `slotSchemas` take any Standard Schema that validates synchronously, and `spec.schema` is a Standard Schema, not a Zod one: validate it with `safeParseStandardSchema` (`@schema-engine/registry`). A slot that declares `appearanceAxes` must take an `appearance` key in its schema input, which the types check. `bindRecipe` keeps the slot schemas on the registration as `slotSchemas`, which `createRecipeRegistry` checks against the recipe's `slots`.
