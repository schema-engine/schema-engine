import { describe, expect, test } from 'vitest';
import { submittedTree, submittedValues, toFormPath, type SubmissionRecord } from '@/state-container/submission';
import { toInternalRecord } from '@/state-container/value-tree';
import { buildSubmissionShape } from '@/lib/submission-shape';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { BaseFieldSchema } from '@/schemas/base-field';
import { defineInput } from '@/types';
import { anyValue } from '../lib/any-value';

const children = z.optional(z.array(z.looseObject({ $type: z.string() })));
const text = defineInput({
	$type: 'text',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('text') }),
	metadata: { name: 'Text', category: 'input' },
	value: anyValue,
	render: () => null,
});
const rows = defineInput({
	childPaths: [{ keys: ['elements'] }],
	$type: 'rows',
	containerKind: 'array',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('rows'), elements: children }),
	metadata: { name: 'Rows', category: 'input' },
	render: () => null,
});
const engine = createFormEngine({ elements: [text, rows] });

const config = engine.validateForm({
	id: 'paths',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{ $type: 'text', name: 'name' },
				{
					$type: 'rows',
					name: 'rows',
					elements: [
						{ $type: 'text', name: 'x' },
						{ $type: 'text', name: 'y' },
					],
				},
				{
					$type: 'rows',
					name: 'groups',
					elements: [
						{ $type: 'text', name: 'label' },
						{
							$type: 'rows',
							name: 'members',
							elements: [
								{ $type: 'text', name: 'n' },
								{ $type: 'text', name: 'm' },
							],
						},
					],
				},
			],
		},
	],
});
const shape = buildSubmissionShape(config.steps);

const record = (values: Record<string, unknown>, excluded: string[]): SubmissionRecord => ({
	values: toInternalRecord(values),
	ids: undefined,
	excluded,
	payload: { tenant: 't1' },
	shape,
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
