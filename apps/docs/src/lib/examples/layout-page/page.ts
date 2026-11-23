import type { AppearanceSelection, ElementGridConfig, GridLayoutConfig } from '@schema-engine/layout';

/** One part of the page: the area of the grid it fills, the element it is, and the markup inside it. */
export interface Region {
	area: string;
	tag: 'header' | 'nav' | 'main' | 'aside' | 'footer';
	/** Markup the host trusts: it is written as is. */
	html: string;
	/** Named appearance, for example `{ surface: 'outlined' }`. */
	appearance?: AppearanceSelection;
	/** The first breakpoint at which the region shows, when it is hidden below it. */
	showFrom?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export interface Page {
	grid: GridLayoutConfig;
	appearance?: AppearanceSelection;
	regions: Region[];
}

/**
 * A dashboard that is one column on a phone, two from `md` and three from `lg`.
 *
 * @remarks
 * Each template draws the page as rows of area names. The navigation is not in the narrowest template, because it is
 * hidden there and shows from `md`.
 */
export const dashboard: Page = {
	grid: {
		areas: {
			default: ['header', 'main', 'aside', 'footer'],
			md: ['header header', 'nav main', 'nav aside', 'footer footer'],
			lg: ['header header header', 'nav main aside', 'footer footer footer'],
		},
	},
	appearance: { size: 'comfortable' },
	regions: [
		{ area: 'header', tag: 'header', html: '<h1>Team dashboard</h1>' },
		{
			area: 'nav',
			tag: 'nav',
			html: '<a href="/overview">Overview</a> <a href="/people">People</a>',
			showFrom: 'md',
		},
		{ area: 'main', tag: 'main', html: '<h2>This week</h2><p>12 pull requests merged.</p>' },
		{
			area: 'aside',
			tag: 'aside',
			html: '<h2>On call</h2><p>Ada Lovelace</p>',
			appearance: { surface: 'outlined' },
		},
		{ area: 'footer', tag: 'footer', html: '<small>Updated every morning</small>' },
	],
};

/** The placement of a region: its area, and the breakpoint it shows from. */
export function placementOf({ area, showFrom }: Region): ElementGridConfig {
	return showFrom === undefined
		? { area }
		: { area, responsive: { default: { hidden: true }, [showFrom]: { hidden: false } } };
}
