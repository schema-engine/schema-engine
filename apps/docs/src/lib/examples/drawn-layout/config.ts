import type { FormConfig } from '@schema-engine/forms';

/** The drawn layout of the styling overview: five fields, stacked below `md`. */
export const drawnLayout: FormConfig = {
	id: 'drawn-layout',
	className: 'drawn-layout',
	grid: {
		areas: {
			default: ['a', 'b', 'c', 'd', 'e'],
			md: ['a a a b b b', 'a a a c c c', 'd d e e e e'],
		},
	},
	steps: [
		{
			id: 'fields',
			title: 'Fields',
			elements: [
				{ $type: 'input', id: 'a', name: 'a', label: 'A', grid: { area: 'a' } },
				{ $type: 'input', id: 'b', name: 'b', label: 'B', grid: { area: 'b' } },
				{ $type: 'input', id: 'c', name: 'c', label: 'C', grid: { area: 'c' } },
				{ $type: 'input', id: 'd', name: 'd', label: 'D', grid: { area: 'd' } },
				{ $type: 'input', id: 'e', name: 'e', label: 'E', grid: { area: 'e' } },
			],
		},
	],
};
