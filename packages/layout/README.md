# @schema-engine/layout

Domain-neutral layout for Schema Engine: a 12-track grid with named widths and drawn areas, named appearance axes such as `size` and `surface`, a compiler that turns both into one theme and one stylesheet, and the recipe protocol a domain uses to declare the frame around its content. It knows nothing about forms, so any host that places items in a container can use it.

## Install

```bash
pnpm add @schema-engine/layout zod
```

The grid and axis schemas use `zod/mini`, so `zod` is a peer dependency. A recipe's slot schemas take any [Standard Schema](https://standardschema.dev/) that validates synchronously (Zod, Valibot, or one you write); the spec's view schema, `spec.schema`, is a Standard Schema too, so validate with `safeParseStandardSchema` from `@schema-engine/registry`, not `.parse`.

`createRecipeRegistry` throws `RegistryError` for an invalid winning recipe. A protocol violation or a mismatch between the declared slots and `slotSchemas` uses `'invalid-declaration'`. A recipe or slot schema that does not implement Standard Schema uses `'invalid-schema'`.

## Example

```ts
import {
	GRID_CLASS,
	GRID_ITEM_CLASS,
	builtInAxes,
	createLayoutTheme,
	defineAxis,
	getAppearanceAttributes,
	getGridItemVariables,
	getGridVariables,
} from '@schema-engine/layout';

const tone = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone' },
	default: 'neutral',
	values: { neutral: {}, brand: { '--primary': '#c2410c' } },
});

export const theme = createLayoutTheme({ appearance: [...builtInAxes, tone] });

export const attributes = getAppearanceAttributes({ size: 'compact', tone: 'brand' });
export const itemVariables = getGridItemVariables({ width: 'half' });
```

Emit `theme.css` once on the page, give the container the `GRID_CLASS` class and `data-se-theme="${theme.id}"`, and write the variables of `getGridVariables` and `getGridItemVariables` as its custom properties and those of its items.

Breakpoints measure the window by default. `createLayoutTheme({ grid: { query: 'container' } })` makes them measure the grid's own wrapper instead, so a grid in a card or a panel follows the room it has. The wrapper is an element with `GRID_CONTAINER_CLASS` and `data-se-theme="${theme.id}"` around each grid; a grid with no wrapper keeps its narrowest layout. The document is the same in both modes.

An element with `grid: { subgrid: true }` spans its parent's full row and lays its children on the parent's column tracks and gap instead of tracks of its own. The item, every box between it and the inner grid, and the inner `GRID_CLASS` grid carry `GRID_SUBGRID_CLASS` and `data-se-theme`, and none may be a `GRID_CONTAINER_CLASS` wrapper or set `container-type`, or the browser falls back to one column without a warning. Keep a `<fieldset>` out of the chain, because Chromium does not make one a subgrid; use a `div` with `role="group"` and `aria-labelledby` its heading. `findSubgridChainBreaks(root)` from `@schema-engine/layout/testing` returns one sentence per break in the chain of each subgrid under `root` (a box without the class, a subgrid without `data-se-theme`, a subgrid with no grid above it), for a renderer's test: `expect(findSubgridChainBreaks(container)).toEqual([])`. A domain passes the children of its subgrids among the items it gives `getGridVariables`.

An item with `grid: { span: n }` takes `n` tracks of the grid it sits in, never more (`span min(n, var(--se-grid-track-count, 1))`). The grid publishes its track count with its template, per breakpoint and in both query modes, and a subgrid passes its parent's count on, so a clamp switches at the width the tracks do. `autoFlow: 'dense'` on the grid backfills gaps. `columns: 'auto'` has no countable tracks in CSS, so a span there is one track and `gridSpanIssues` reports it; use `columns` per breakpoint with a container theme. An item and the grid it contains must be different elements.

## Entry points

| Import                          | Holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@schema-engine/layout`         | `createLayoutTheme`, `defineAxis` and `builtInAxes`, the grid helpers (`getGridVariables`, `getGridItemVariables`) and the hooks `GRID_CLASS`, `GRID_ITEM_CLASS`, `GRID_SUBGRID_CLASS` and `GRID_CONTAINER_CLASS`, the placement checks `elementIsSubgrid`, `subgridPlacementIssue`, `spanPlacementIssue` and `gridSpanIssues`, `getAppearanceAttributes`, and the recipe protocol (`defineRecipeProtocol`, `resolveRecipeView`). It has no DOM types, so a server compiles it without the DOM lib |
| `@schema-engine/layout/testing` | The DOM check `findSubgridChainBreaks`, for a renderer's tests; it needs the DOM types                                                                                                                                                                                                                                                                                                                                                                                                             |

## Documentation

- [Layout](https://schema-engine.com/docs/layout/overview): install, compile a theme and place items with no forms.
- [Grid and placement](https://schema-engine.com/docs/layout/grid-and-placement): widths, offsets, areas and breakpoints.
- [Layout themes](https://schema-engine.com/docs/layout/layout-themes): compile, share and nest themes.
- [Appearance axes](https://schema-engine.com/docs/layout/appearance-axes): `size`, `surface` and your own, and identity tokens for values that every entity has for itself.
- [Theming](https://schema-engine.com/docs/layout/theming): the custom properties a host overrides.
- [Recipe protocol](https://schema-engine.com/docs/layout/recipe-protocol): declare the slots and kinds of a domain's view recipes.
- [Recipes outside forms](https://schema-engine.com/docs/layout/recipes-outside-forms): a card recipe bound for React and for Radiant.
- [Upgrade from 0.5 to 0.6](https://schema-engine.com/docs/schema-engine/migrate-0-5-to-0-6): the breaking changes, with the code before and after.
- [For AI agents](https://schema-engine.com/docs/schema-engine/agent-skill): the package ships its part of the agent skill.

## License

MIT
