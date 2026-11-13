# @schema-engine/layout

Domain-neutral layout for Schema Engine: the grid schemas and compiler, named placement, the appearance axes, and `createLayoutTheme`, which compiles grid and appearance into one theme.

It knows nothing about forms and does not depend on `@schema-engine/forms`. `@schema-engine/forms` and its renderers build on it, and any other domain that places items in a container can reuse the same rules.

## Installation

```bash
pnpm add @schema-engine/layout zod
```

The grid and axis schemas use `zod/mini`, so `zod` is a peer dependency. Axes are stored with `@schema-engine/registry`, which installs with this package.

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
createLayoutTheme({ appearance: [...builtInAxes, step] }, { reservedNames: ['step'] }); // throws
```

## Appearance axes

An appearance axis is one independent dimension of appearance, with 2 to 5 named values. Each value stands for a set of semantic CSS tokens, which components read. Components never read an axis value. The theme declares the axes, a registration declares which axes it responds to, and a document picks values that pass down.

`defineAxis({ $type, values, default, metadata })` builds an axis:

- `$type` is the axis name and the `data-se-<axis>` attribute.
- `values` maps each value name to its tokens (`--` keys only). A value that sets no token leaves the component's own fallback in place.
- `default` names the value that stands for no pick. It must be one of `values`.
- `metadata` is the name and description a catalog or an editor shows.

`defineAxis` also produces the axis's Standard Schema (an enum of the value names), because the registry requires one. It throws on a bad name, fewer than 2 or more than 5 values, a value that would break a selector, a token that is not a custom property, or a `default` that is not a value.

`builtInAxes` is the default list: `size` (`compact`, `default`, `comfortable`) sets `--se-space`, `--se-font-size` and `--se-control-height`; `surface` (`flat`, `outlined`, `elevated`) sets `--se-border-width`, `--se-shadow` and `--se-surface-background`. The tokens are renderer-neutral and name no host theme. `size.default` sets none, so a renderer's own fallbacks, mapped to its host theme, stay in force and `size: default` looks like no pick.

`createLayoutTheme({ appearance: [...builtInAxes, myAxis] })` builds the axes into a registry: the last axis of a `$type` wins, so listing a `size` axis after the built-ins overrides it. A list without `builtInAxes` has no `size` or `surface`.

Rules for a good axis: orthogonal to the others; the same meaning on every component, so tokens name a role and never a component (a card's width is the card's own CSS, not a token); a small closed set of named values; appearance only, never structure.

`createAppearanceSchema(registry)` builds the schema of a pick from the theme's axes: each axis an optional enum of its values, which a JSON Schema export lists.

## The stylesheet hooks

The stylesheet selects only `.se-grid`, `.se-grid-item` and `[data-se-theme]`. A renderer puts `GRID_CLASS` (`se-grid`) on every grid container, `GRID_ITEM_CLASS` (`se-grid-item`) on every item placed in one, and `data-se-theme="<id>"` on both. It adds them beside its own classes. There are no aliases for another class name.

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

| Function                               | Does                                                        |
| -------------------------------------- | ----------------------------------------------------------- |
| `checkAppearance(authored, options)`   | Checks a pick against the vocabulary and the owner's axes   |
| `mergeAppearance(inherited, own)`      | Lays a child's pick over the pick it inherits               |
| `pickSupportedAppearance(picks, axes)` | Keeps the axes an owner supports                            |
| `getAppearanceAttributes(selection)`   | Produces the `data-se-<axis>` attributes a renderer spreads |

`AppearanceConfigSchema` is the open schema of a pick (`{ size: 'compact' }`); `createAppearanceSchema` is the one closed over a theme's axes.

## Grid schemas

`GridLayoutConfigSchema` (a container's `grid`) and `ElementGridConfigSchema` (an item's `grid`) are Zod Mini schemas, with `GridLayoutConfig` and `ElementGridConfig` as their inferred types. They also export the gap tokens and the named widths and offsets. Area names are checked by a pattern that the JSON Schema export carries. Placement helpers used by validators (`namedPlacementOverflow`, `gridAreaTemplates`, `areaTemplateIssues`, and the cascade helpers) are exported too.

## Tests

`pnpm --filter @schema-engine/layout test:all` runs the grid compiler, placement, theme and appearance unit tests. The renderer packages run the shared acceptance harnesses in `test-utils/` against this package's output.
