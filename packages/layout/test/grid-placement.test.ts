import { describe, expect, test } from 'vitest';
import { areaTemplateIssues } from '@/index';

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
