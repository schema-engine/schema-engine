# @schema-engine/layout

Domain-neutral layout for Schema Engine: the grid schemas and compiler, named placement, the appearance vocabulary, `createLayoutTheme`, which compiles grid and appearance into one theme, and the recipe protocol that lets a domain declare the slots and kinds of its view recipes.

It knows nothing about forms and does not depend on `@schema-engine/forms`. `@schema-engine/forms` and its renderers build on it, and any other domain that places items in a container can reuse the same rules.

## Installation

```bash
pnpm add @schema-engine/layout zod
```

The grid and recipe schemas use `zod/mini`, so `zod` is a peer dependency. The recipe registry comes from `@schema-engine/registry`, which is installed with it.

## One theme

`createLayoutTheme({ grid, appearance }, { reservedNames })` compiles both vocabularies once into a frozen theme:

- `id`: one identity for the whole theme, the value of the `data-se-theme` attribute.
- `css`: one stylesheet, scoped by `[data-se-theme="<id>"]`.
- `grid`: the resolved grid vocabulary, which the emitters read.
- `axes`: appearance axis name to its closed value list.

```ts
import { createLayoutTheme } from '@schema-engine/layout';

const theme = createLayoutTheme({
	grid: {
		breakpoints: { md: '50rem' },
		gap: { default: '1rem', loose: '1.5rem' },
		responsive: { lg: { default: '1.5rem' } },
	},
	appearance: {
		tone: { brand: { '--se-tone-accent': '#f60' } },
		size: ['dense'],
	},
});
```

Options that describe the same theme give the same id, whatever order the grid's responsive entries were written in, so two engines built from equal options share a stylesheet. Axis and value order is part of the identity. Compile once and pass the theme to several consumers to make them carry the same `data-se-theme`. With the forms engine:

```ts
import { createFormEngine } from '@schema-engine/forms';

const checkout = createFormEngine({ elements, layout: theme });
const profile = createFormEngine({ elements, layout: theme });
```

`isLayoutTheme(value)` tells a compiled theme from options for one, and `getDefaultLayoutTheme()` is the shared library default.

### Reserved axis names

An appearance axis becomes a `data-se-<axis>` attribute, so it must not reuse an attribute a renderer already writes. The compiler hard-codes none: each domain passes its own as `reservedNames`, and `assertAxesNotReserved(theme, reservedNames)` re-checks a theme compiled elsewhere.

```ts
createLayoutTheme({ appearance: { step: ['a'] } }, { reservedNames: ['step'] }); // throws
```

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

`AppearanceConfigSchema` is the schema of a pick (`{ size: 'compact' }`).

## Recipe protocol

A recipe composes slots (shell, header, content, ...) into a view. The spec, binding, slot defaults and resolved view are the same for every domain, so they live here; each domain declares the slots, kinds and rules its recipes use, once:

```ts
import * as z from 'zod/mini';
import {
	AppearanceConfigSchema,
	bindRecipe,
	createRecipeRegistry,
	defineRecipeProtocol,
	defineRecipeSpec,
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

const hero = defineRecipeSpec(sectionProtocol, {
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

- `slots` is ordered: a spec lists the slots it declares in that order. A slot or kind outside the protocol is a type error in `defineRecipeSpec` (including `slotDefaults` and `appearanceAxes` keys) and a thrown error for a hand-written registration.
- A rule's `check` returns the problem, or `undefined`. A failure reads `Recipe 'hero' breaks rule 'section-needs-content': ...`.
- Rules run in `defineRecipeSpec` and, in `createRecipeRegistry`, on each winning registration of a `$type` (a recipe overridden later in the list is skipped). The registry is the read-only one from `@schema-engine/registry`.
- `defineRecipeSpec` checks `slotDefaults` against the slot schemas and requires a slot that declares `appearanceAxes` to accept an `appearance` key. It keeps the concrete view schema type, so a domain can infer the authoring type of a view from a registration.
- The protocol types are `RecipeProtocol`, `RecipeRule` and `RecipeShape` (what a rule reads), with `SlotOf` and `KindOf` to get the names back from a protocol, and `RecipeSpec` and `RecipeRegistration` for the spec and its binding. `assertRecipeRules(protocol, recipe)` is the check both entry points run, for a domain that validates a recipe outside a registry.
- `mergeSlotDefaults(view, slotDefaults)` lays a view's slot config over the recipe defaults, deep for plain objects. `getSlotConfig(viewConfig, slot, schema)` reads one slot of a resolved view, and `RecipeViewModel` is the part of a renderer's view model that every domain shares.

The render payload is opaque here: `bindRecipe(spec, render)` stores whatever a domain's renderers need. Forms declares its protocol in [`@schema-engine/forms/recipes`](../forms/README.md); the built-in form recipes stay there.

## Grid schemas

`GridLayoutConfigSchema` (a container's `grid`) and `ElementGridConfigSchema` (an item's `grid`) are Zod Mini schemas, with `GridLayoutConfig` and `ElementGridConfig` as their inferred types. They also export the gap tokens and the named widths and offsets. Area names are checked by a pattern that the JSON Schema export carries. Placement helpers used by validators (`namedPlacementOverflow`, `gridAreaTemplates`, `areaTemplateIssues`, and the cascade helpers) are exported too.

## Tests

`pnpm --filter @schema-engine/layout test:all` runs the grid compiler, placement, theme, appearance and recipe protocol unit tests. The renderer packages run the shared acceptance harnesses in `test-utils/` against this package's output.
