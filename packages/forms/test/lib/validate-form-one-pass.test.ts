import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { elementChildrenSchema } from '@/lib/element-children';
import { defineInput } from '@/types';
import { ElementGridConfigSchema } from '@schema-engine/layout';
import { anyValue } from './any-value';

const field = defineInput({
	value: anyValue,
	$type: 'field',
	schema: z.looseObject({
		$type: z.literal('field'),
		id: z.string(),
		name: z.string(),
		grid: z.optional(ElementGridConfigSchema),
		rules: z.optional(z.array(z.looseObject({ $type: z.string() }))),
	}),
	appearanceAxes: ['size'],
	metadata: { name: 'Field', category: 'input' },
	render: () => null,
});

const group = defineInput({
	$type: 'group',
	childPaths: [{ keys: ['elements'], list: true }],
	schema: z.looseObject({
		$type: z.literal('group'),
		id: z.string(),
		name: z.optional(z.string()),
		grid: z.optional(ElementGridConfigSchema),
		rules: z.optional(z.array(z.looseObject({ $type: z.string() }))),
		elements: elementChildrenSchema,
	}),
	appearanceAxes: ['size'],
	metadata: { name: 'Group', category: 'input' },
	render: () => null,
});

const widened = defineInput({
	value: anyValue,
	$type: 'widened',
	schema: z.pipe(
		z.looseObject({ $type: z.literal('widened'), id: z.string(), name: z.string() }),
		z.transform((config) => ({ ...config, grid: { width: 'half' } })),
	),
	metadata: { name: 'Widened', category: 'input' },
	render: () => null,
});

const engine = createFormEngine({ elements: [field, group, widened] });

const formWith = (elements: unknown[], extra: Record<string, unknown> = {}) => ({
	id: 'pass',
	steps: [{ id: 'main', title: 'Main', elements }],
	...extra,
});
const leaf = (name: string, extra: Record<string, unknown> = {}) => ({ $type: 'field', id: name, name, ...extra });
const nameless = { $type: 'field', id: 'nameless' };
const groupOf = (elements: unknown[], extra: Record<string, unknown> = {}) => ({
	$type: 'group',
	id: 'g',
	name: 'g',
	elements,
	...extra,
});

function paths(form: unknown): string[] {
	const result = engine.safeValidateForm(form);
	if (result.success) throw new Error('expected the form to be invalid');
	return result.issues.map((issue) => issue.path.join('.'));
}

describe('one pass: every issue of a form is reported together', () => {
	test('a container reports each failing child, in document order', () => {
		const form = formWith([
			groupOf([nameless, leaf('__b'), leaf('c', { rules: [{ $type: 'unregistered-rule' }] })]),
		]);
		expect(paths(form)).toEqual([
			'steps.0.elements.0.elements.0.name',
			'steps.0.elements.0.elements.1.name',
			'steps.0.elements.0.elements.2.rules.0.$type',
		]);
	});

	test('the registry issues come first, then the container own issue', () => {
		expect(paths(formWith([groupOf([nameless], { name: '__g' })]))).toEqual([
			'steps.0.elements.0.elements.0.name',
			'steps.0.elements.0.name',
		]);
	});

	test('a node reports every failing check family, and its failing child is checked too', () => {
		const form = formWith(
			[
				groupOf([nameless], {
					name: '__g',
					rules: [{ $type: 'unregistered-rule' }],
					grid: { span: 2, column: 2 },
					appearance: { surface: 'flat' },
				}),
			],
			{ grid: { columns: 3 } },
		);
		expect(paths(form)).toEqual([
			'steps.0.elements.0.elements.0.name',
			'steps.0.elements.0.rules.0.$type',
			'steps.0.elements.0.name',
			'steps.0.elements.0.grid.column',
			'steps.0.elements.0.appearance.surface',
		]);
	});

	test('a child with a failing check of its own is still checked beside a parent that failed one', () => {
		const form = formWith([groupOf([leaf('__c')], { name: '__g' })]);
		expect(paths(form)).toEqual(['steps.0.elements.0.name', 'steps.0.elements.0.elements.0.name']);
	});

	test('a cycle is reported at the first repeat', () => {
		const cyclic: Record<string, unknown> = { $type: 'group', id: 'g', name: 'g', elements: [] };
		(cyclic.elements as unknown[]).push(cyclic);
		const result = engine.safeValidateForm(formWith([cyclic]));
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues.map(({ code, path }) => ({ code, path: path.join('.') }))).toEqual([
			{ code: 'registry/contains-itself', path: 'steps.0.elements.0.elements.0' },
		]);
	});

	test('a cyclic subgrid is reported once and placement does not recurse', () => {
		const cyclic: Record<string, unknown> = {
			$type: 'group',
			id: 'g',
			name: 'g',
			grid: { subgrid: true },
			elements: [],
		};
		(cyclic.elements as unknown[]).push(cyclic);
		const result = engine.safeValidateForm(formWith([cyclic], { grid: { columns: 3 } }));
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(
			result.issues
				.map((issue) => issue.path.join('.'))
				.filter((path) => path === 'steps.0.elements.0.elements.0'),
		).toEqual(['steps.0.elements.0.elements.0']);
	});

	test('placement reads a child own parsed output, at its authored index, beside an invalid sibling', () => {
		const form = formWith(
			[
				groupOf([nameless, { $type: 'widened', id: 'w', name: 'w' }], {
					grid: { subgrid: true },
				}),
			],
			{ grid: { columns: 3 } },
		);
		const result = paths(form);
		expect(result).toContain('steps.0.elements.0.elements.0.name');
		expect(result).toContain('steps.0.elements.0.elements.1.grid.width');
	});

	test('an element with an issue still counts for the payload', () => {
		const form = formWith([groupOf([nameless], { name: 'account' })], { payload: { account: 1 } });
		expect(paths(form)).toEqual(['steps.0.elements.0.elements.0.name', 'payload.account']);
	});

	test('an element with an issue still counts for the fields a later step constraint may read', () => {
		const form = {
			id: 'pass',
			steps: [
				{ id: 'one', title: 'One', elements: [groupOf([leaf('plan'), nameless], { name: 'account' })] },
				{
					id: 'two',
					title: 'Two',
					elements: [leaf('other')],
					constraints: [{ field: 'account.plan', operator: 'equals', value: true, $type: 'show' }],
				},
			],
		};
		expect(paths(form)).toEqual(['steps.0.elements.0.elements.1.name']);
	});

	test('a top-level element without $type is the issue of that element, beside the others', () => {
		const result = engine.safeValidateForm(formWith([{ id: 'untyped' }, leaf('__x')]));
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues.map(({ code, path }) => ({ code, path: path.join('.') }))).toEqual([
			{ code: 'registry/missing-type', path: 'steps.0.elements.0.$type' },
			{ code: undefined, path: 'steps.0.elements.1.name' },
		]);
	});
});

describe('one pass: an element that declares no child path holds no children for the checks of a step', () => {
	test('a cyclic non-container is an issue, not a RangeError, with or without a payload', () => {
		const cyclic: Record<string, unknown> = { $type: 'field', id: 'c', name: 'c', elements: [] };
		(cyclic.elements as unknown[]).push(cyclic);
		for (const extra of [{}, { payload: {} }]) {
			expect(paths(formWith([cyclic], extra))).toEqual(['steps.0.elements.0.elements']);
		}
	});

	test('a null child of a non-container is an issue, not a TypeError, with a payload', () => {
		const form = formWith([{ $type: 'field', id: 'x', name: 'x', elements: [null] }], { payload: {} });
		expect(paths(form)).toEqual(['steps.0.elements.0.elements']);
	});

	test('a child of a non-container is no field for a later step constraint', () => {
		const form = {
			id: 'pass',
			steps: [
				{ id: 'one', title: 'One', elements: [leaf('a', { elements: [leaf('k')] })] },
				{
					id: 'two',
					title: 'Two',
					elements: [leaf('other')],
					constraints: [{ field: 'a.k', operator: 'equals', value: true, $type: 'show' }],
				},
			],
		};
		expect(paths(form)).toEqual(['steps.0.elements.0.elements', 'steps.1.constraints.0.field']);
	});

	test('a non-container that holds elements still has its other families checked', () => {
		const form = formWith([leaf('__x', { elements: [leaf('a')], rules: [{ $type: 'unregistered-rule' }] })]);
		expect(paths(form)).toEqual([
			'steps.0.elements.0.elements',
			'steps.0.elements.0.rules.0.$type',
			'steps.0.elements.0.name',
		]);
	});
});

describe('one pass: an action with no registered $type does not stop the other checks of the form', () => {
	test('an entry with an empty $type is that entry issue, beside the others', () => {
		const form = formWith([leaf('__x')], { actions: [{ id: 'a', $type: '' }] });
		expect(paths(form)).toEqual(['steps.0.elements.0.name', 'actions.0.$type']);
	});

	test('a step entry with an empty $type is that entry issue, beside the others', () => {
		const form = {
			id: 'pass',
			steps: [{ id: 'main', title: 'Main', elements: [leaf('__x')], actions: [{ id: 'a', $type: '' }] }],
		};
		expect(paths(form)).toEqual(['steps.0.elements.0.name', 'steps.0.actions.0.$type']);
	});
});

describe('one pass: children a schema adds to an element that holds none', () => {
	test('a static schema that defaults elements to children is rejected, not branded unchecked', () => {
		const sneaky = {
			kind: 'static',
			$type: 'sneaky',
			schema: z.looseObject({
				$type: z.literal('sneaky'),
				elements: z._default(elementChildrenSchema, [{ $type: 'unregistered' }]),
			}),
			metadata: { name: 'Sneaky', category: 'content' },
			render: () => null,
		} as const;
		const sneakyEngine = createFormEngine({ elements: [field, sneaky] });
		const result = sneakyEngine.safeValidateForm(formWith([{ $type: 'sneaky' }]));
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues).toEqual([
			{
				path: ['steps', 0, 'elements', 0, 'elements'],
				message: `Element 'sneaky' declares no child path, so it cannot hold elements.`,
			},
		]);
	});
});
