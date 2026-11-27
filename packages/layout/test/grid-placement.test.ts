import { describe, expect, test } from 'vitest';
import { areaTemplateIssues, elementIsSubgrid, subgridPlacementIssue } from '@/index';

describe('subgrid placement', () => {
	test('elementIsSubgrid reads only the top-level flag', () => {
		expect(elementIsSubgrid({ grid: { subgrid: true } })).toBe(true);
		expect(elementIsSubgrid({ grid: { subgrid: false } })).toBe(false);
		expect(elementIsSubgrid({ grid: { width: 'half' } })).toBe(false);
		expect(elementIsSubgrid({})).toBe(false);
		expect(elementIsSubgrid(undefined)).toBe(false);
	});

	test('a subgrid that only hides or spaces itself has no issue', () => {
		const element = {
			grid: {
				subgrid: true,
				row: 2,
				alignSelf: 'start',
				marginBlockStart: 'loose',
				responsive: { md: { hidden: true } },
			},
		};
		expect(subgridPlacementIssue(element)).toBeUndefined();
	});

	test('an element that is not a subgrid has no issue whatever it places', () => {
		expect(subgridPlacementIssue({ grid: { width: 'half', column: 2 } })).toBeUndefined();
	});

	test.each(['width', 'offset', 'column', 'area', 'justifySelf', 'placeSelf'] as const)(
		'a subgrid that sets %s points at that key',
		(key) => {
			const issue = subgridPlacementIssue({ grid: { subgrid: true, [key]: 'x' } });
			expect(issue?.path).toEqual(['grid', key]);
			expect(issue?.message).toContain(`'subgrid' and '${key}'`);
		},
	);

	test('a conflicting key of a breakpoint points at the breakpoint', () => {
		const issue = subgridPlacementIssue({ grid: { subgrid: true, responsive: { md: { width: 'half' } } } });
		expect(issue?.path).toEqual(['grid', 'responsive', 'md', 'width']);
	});
});

describe('areaTemplateIssues reports issues with paths relative to the grid', () => {
	test('a grid with sound templates has no issue', () => {
		expect(areaTemplateIssues({ areas: ['a b', 'c c'] })).toEqual([]);
		expect(areaTemplateIssues(undefined)).toEqual([]);
	});

	test('a ragged template in the array form points at areas', () => {
		const issues = areaTemplateIssues({ areas: ['a b', 'c'] });

		expect(issues).toEqual([{ path: ['areas'], message: 'row 2 has 1 cell but row 1 has 2.' }]);
	});

	test('a ragged template of a breakpoint points at areas and the breakpoint', () => {
		const issues = areaTemplateIssues({ areas: { default: ['a b'], md: ['a b', 'c'] } });

		expect(issues).toEqual([{ path: ['areas', 'md'], message: 'row 2 has 1 cell but row 1 has 2.' }]);
	});

	test('a default template written as a record points at its own key', () => {
		const issues = areaTemplateIssues({ areas: { default: ['a b', 'a a'] } });

		expect(issues.map((issue) => issue.path)).toEqual([['areas', 'default']]);
		expect(issues[0]?.message).toMatch(/area 'a' is not rectangular/);
	});

	test('the array form of the default template points at areas, not at default', () => {
		const issues = areaTemplateIssues({ areas: ['a b', 'a a'] });

		expect(issues.map((issue) => issue.path)).toEqual([['areas']]);
	});
});
