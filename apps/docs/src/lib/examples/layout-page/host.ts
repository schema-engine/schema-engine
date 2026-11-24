import {
	GRID_CLASS,
	GRID_ITEM_CLASS,
	GridLayoutConfigSchema,
	areaTemplateIssues,
	getAppearanceAttributes,
	getGridItemVariables,
	getGridVariables,
	type AppearanceSelection,
	type CssVariables,
} from '@schema-engine/layout';
import { placementOf, type Page } from './page';
import { theme } from './theme';

/** The value of a `style` attribute. A drawn template quotes its area names, so the quotes are escaped. */
const style = (variables: CssVariables) =>
	Object.entries(variables)
		.map(([name, value]) => `${name}:${value}`)
		.join(';')
		.replaceAll('"', '&quot;');

const attributes = (appearance?: AppearanceSelection) =>
	Object.entries(getAppearanceAttributes(appearance))
		.map(([name, value]) => ` ${name}="${value}"`)
		.join('');

/**
 * Lays a page out and returns its markup: a container that carries the grid, and one item for each region.
 *
 * @remarks
 * A host does three things: it puts the grid and item classes and the theme id on its elements, writes the custom
 * properties that place them, and adds `theme.css` to the page once. The grid is checked first: the schema checks the
 * names, and `areaTemplateIssues` checks what CSS would drop, a template whose rows differ in length or whose area is
 * not a rectangle. Either throws here and not as a layout that silently breaks.
 */
export function renderPage(page: Page): string {
	const grid = GridLayoutConfigSchema.safeParse(page.grid);
	const issues = grid.success ? areaTemplateIssues(grid.data) : grid.error.issues;
	if (!grid.success || issues.length > 0) {
		throw new Error(issues.map((issue) => `${issue.path?.join('.')}: ${issue.message}`).join('\n'));
	}
	const items = page.regions.map((region) => ({ grid: placementOf(region) }));
	const regions = page.regions.map((region, index) => {
		const marks = `data-se-theme="${theme.id}"${attributes(region.appearance)}`;
		const open = `<${region.tag} class="${GRID_ITEM_CLASS}" ${marks}`;
		return `${open} style="${style(getGridItemVariables(items[index]!.grid))}">${region.html}</${region.tag}>`;
	});
	const container = `<div class="${GRID_CLASS}" data-se-theme="${theme.id}"${attributes(page.appearance)}`;
	return [
		`${container} style="${style(getGridVariables(grid.data, theme.grid, items))}">`,
		...regions,
		'</div>',
	].join('\n');
}
