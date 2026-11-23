import { describe, expect, test } from 'vitest';
import { submittedTree, submittedValues, toFormPath, type SubmissionRecord } from '@/state-container/submission';
import { toInternalRecord } from '@/state-container/value-tree';

const record = (values: Record<string, unknown>, excluded: string[]): SubmissionRecord => ({
	outcome: 'passed',
	values: toInternalRecord(values),
	ids: undefined,
	excluded,
	payload: { tenant: 't1' },
	epoch: 0,
});

describe('the paths of a submission', () => {
	const rows = record({ name: 'Ada', rows: [{ x: 1 }, { x: 2 }, { x: 3 }, { x: 4 }] }, ['rows.1', 'rows.3.x']);

	test('an index counts only the rows that took part, so submitted row 1 is the form row after the one left out', () => {
		expect(submittedValues(rows)).toEqual({ name: 'Ada', rows: [{ x: 1 }, { x: 3 }, {}], tenant: 't1' });
		expect(toFormPath(rows, 'rows.0.x')).toBe('rows.0.x');
		expect(toFormPath(rows, 'rows.1.x')).toBe('rows.2.x');
		expect(toFormPath(rows, 'rows.2')).toBe('rows.3');
		expect(toFormPath(rows, 'rows')).toBe('rows');
		expect(toFormPath(rows, 'name')).toBe('name');
		expect(toFormPath(rows, '')).toBe('');
	});

	test('maps through nested arrays and objects, each level counting its own rows', () => {
		const nested = record(
			{ groups: [{ members: [{ n: 'a' }, { n: 'b' }] }, { members: [{ n: 'c' }, { n: 'd' }, { n: 'e' }] }] },
			['groups.0', 'groups.1.members.0'],
		);
		expect(toFormPath(nested, 'groups.0.members.1.n')).toBe('groups.1.members.2.n');
		expect(submittedTree(nested)).toEqual(toInternalRecord({ groups: [{ members: [{ n: 'd' }, { n: 'e' }] }] }));
	});

	test('keeps every index when nothing was left out', () => {
		const all = record({ rows: [{ x: 1 }, { x: 2 }] }, []);
		expect(toFormPath(all, 'rows.1.x')).toBe('rows.1.x');
	});
});
