# @schema-engine/layout

Domain-neutral layout for Schema Engine: a 12-track grid with named widths and drawn areas, named appearance axes such as `size` and `surface`, a compiler that turns both into one theme and one stylesheet, and the recipe protocol a domain uses to declare the frame around its content. It knows nothing about forms, so any host that places items in a container can use it.

## Install

```bash
pnpm add @schema-engine/layout zod
```

The grid, axis and recipe schemas use `zod/mini`, so `zod` is a peer dependency.

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

## Entry points

The package has one entry, `@schema-engine/layout`: `createLayoutTheme`, `defineAxis` and `builtInAxes`, the grid helpers (`getGridVariables`, `getGridItemVariables`), `getAppearanceAttributes`, and the recipe protocol (`defineRecipeProtocol`, `resolveRecipeView`).

## Documentation

- [Layout](https://schema-engine.ecopages.app/docs/layout/overview): install, compile a theme and place items with no forms.
- [Grid and placement](https://schema-engine.ecopages.app/docs/layout/grid-and-placement): widths, offsets, areas and breakpoints.
- [Layout themes](https://schema-engine.ecopages.app/docs/layout/layout-themes): compile, share and nest themes.
- [Appearance axes](https://schema-engine.ecopages.app/docs/layout/appearance-axes): `size`, `surface` and your own.
- [Theming](https://schema-engine.ecopages.app/docs/layout/theming): the custom properties a host overrides.
- [Recipe protocol](https://schema-engine.ecopages.app/docs/layout/recipe-protocol): declare the slots and kinds of a domain's view recipes.
- [For AI agents](https://schema-engine.ecopages.app/docs/schema-engine/agent-skill): the package ships its part of the agent skill.

## License

MIT
