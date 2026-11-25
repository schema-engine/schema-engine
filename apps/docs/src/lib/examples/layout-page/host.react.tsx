/** @jsxImportSource react */
import type { ReactElement } from 'react';
import {
	GRID_CLASS,
	GRID_ITEM_CLASS,
	GridLayoutConfigSchema,
	areaTemplateIssues,
	getAppearanceAttributes,
	getGridItemVariables,
	getGridVariables,
} from '@schema-engine/layout';
import { placementOf, type Page } from './page';
import { theme } from './theme';

/**
 * Lays a page out: a container that carries the grid, and one item for each region.
 *
 * @remarks
 * A host does three things: it puts the grid and item classes and the theme id on its elements, writes the custom
 * properties that place them, and adds `theme.css` to the page once. The grid is checked first: the schema checks the
 * names, and `areaTemplateIssues` checks what CSS would drop, a template whose rows differ in length or whose area is
 * not a rectangle. Either throws here and not as a layout that silently breaks.
 */
export function renderPage(page: Page): ReactElement {
	const grid = GridLayoutConfigSchema.safeParse(page.grid);
	const issues = grid.success ? areaTemplateIssues(grid.data) : grid.error.issues;
	if (!grid.success || issues.length > 0) {
		throw new Error(issues.map((issue) => `${issue.path?.join('.')}: ${issue.message}`).join('\n'));
	}
	const items = page.regions.map((region) => ({ grid: placementOf(region) }));
	return (
		<div
			className={GRID_CLASS}
			data-se-theme={theme.id}
			{...getAppearanceAttributes(page.appearance)}
			style={getGridVariables(grid.data, theme.grid, items)}
		>
			{page.regions.map((region, index) => {
				const Tag = region.tag;
				return (
					<Tag
						key={region.area}
						className={GRID_ITEM_CLASS}
						data-se-theme={theme.id}
						{...getAppearanceAttributes(region.appearance)}
						style={getGridItemVariables(items[index]!.grid)}
						dangerouslySetInnerHTML={{ __html: region.html }}
					/>
				);
			})}
		</div>
	);
}
