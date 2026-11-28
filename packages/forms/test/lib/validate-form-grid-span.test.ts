import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { elementChildrenSchema } from '@/lib/element-children';
import { defineInput } from '@/types';
import { ElementGridConfigSchema } from '@schema-engine/layout';
import { anyValue } from '../lib/any-value';

const formWith = (elements: unknown[], grid?: unknown) => ({
	id: 'span',
	...(grid ? { grid } : {}),
	steps: [{ id: 'main', title: 'Main', elements }],
});
const field = (name: string, grid?: unknown) => ({ $type: 'field', id: name, name, ...(grid ? { grid } : {}) });
const subgrid = (name: string, elements: unknown[]) => ({
	$type: 'group',
	id: name,
	name,
	elements,
	grid: { subgrid: true },
});

describe('numeric span validation', () => {
	const gridField = defineInput({
		value: anyValue,
		$type: 'field',
		schema: z.looseObject({
			$type: z.literal('field'),
			id: z.string(),
			name: z.string(),
			grid: z.optional(ElementGridConfigSchema),
		}),
		metadata: { name: 'Field', category: 'input' },
		render: () => null,
	});
	const group = defineInput({
		childPaths: [{ keys: ['elements'] }],
		$type: 'group',
		containerKind: 'object',
		schema: z.looseObject({
			$type: z.literal('group'),
			id: z.string(),
			name: z.string(),
			grid: z.optional(ElementGridConfigSchema),
			elements: elementChildrenSchema,
		}),
		metadata: { name: 'group', category: 'input' },
		render: () => null,
	});
	const engine = createFormEngine({ elements: [gridField, group] });

	const only = (form: unknown) => {
		const result = engine.safeValidateForm(form);
		if (result.success) throw new Error('Expected the form to be rejected.');
		expect(result.issues).toHaveLength(1);
		return result.issues[0]!;
	};

	test('spans under a numeric grid, also per breakpoint, are accepted', () => {
		const form = formWith(
			[
				field('a', { span: 2 }),
				field('b', { span: 7 }),
				field('c', { span: 3, responsive: { md: { span: 5 } } }),
			],
			{ columns: 4, autoFlow: 'dense', responsive: { md: { columns: 12 } } },
		);
		expect(() => engine.validateForm(form)).not.toThrow();
	});

	test.each([
		['width', { width: 'half' }],
		['offset', { offset: 'quarter' }],
		['column', { column: 2 }],
		['area', { area: 'a' }],
	])('a field that sets span and %s in one slot is rejected at that key', (key, extra) => {
		const issue = only(formWith([field('lonely', { span: 2, ...extra })], { columns: 4 }));
		expect(issue.path).toEqual(['steps', 0, 'elements', 0, 'grid', key]);
		expect(issue.message).toMatch(new RegExp(`'lonely'.*'span' and '${key}'`));
	});

	test('span in one slot and a width in another is accepted', () => {
		const form = formWith([field('a', { span: 2, responsive: { md: { width: 'half' } } })]);
		expect(() => engine.validateForm(form)).not.toThrow();
	});

	test.each([0, 1.5])('span: %s is rejected by the grid schema', (span) => {
		const issue = only(formWith([field('a', { span })], { columns: 4 }));
		expect(issue.path).toContain('span');
	});

	test('autoFlow inside responsive is rejected, and only row and dense are values', () => {
		expect(only(formWith([field('a')], { responsive: { md: { autoFlow: 'dense' } } })).path).toContain('autoFlow');
		expect(only(formWith([field('a')], { autoFlow: 'column' })).path).toEqual(['grid', 'autoFlow']);
	});

	test('a span under columns: auto is reported at the field, with the unknown track count as the reason', () => {
		const issue = only(formWith([field('card', { span: 2 })], { columns: 'auto' }));
		expect(issue.path).toEqual(['steps', 0, 'elements', 0, 'grid', 'span']);
		expect(issue.message).toMatch(/'card'.*'span'.*columns are 'auto'.*one track/);
	});

	test('a span that carries into a breakpoint where the columns turn auto is reported at the span key', () => {
		const form = formWith([field('card', { responsive: { sm: { span: 2 } } })], {
			columns: 4,
			responsive: { lg: { columns: 'auto' } },
		});
		const issue = only(form);
		expect(issue.path).toEqual(['steps', 0, 'elements', 0, 'grid', 'responsive', 'sm', 'span']);
		expect(issue.message).toContain("at 'lg'");
	});

	test('a step grid of auto columns is the one a span is checked against, and a form grid is the fallback', () => {
		const form = {
			id: 'span',
			grid: { columns: 4 },
			steps: [
				{ id: 'a', title: 'A', elements: [field('x', { span: 2 })] },
				{ id: 'b', title: 'B', grid: { columns: 'auto' }, elements: [field('y', { span: 2 })] },
			],
		};
		expect(only(form).path).toEqual(['steps', 1, 'elements', 0, 'grid', 'span']);
	});

	test('a span inside a subgrid is checked against the grid it sits on, at its own key', () => {
		const issue = only(formWith([subgrid('address', [field('street', { span: 2 })])], { columns: 'auto' }));
		expect(issue.path).toEqual(['steps', 0, 'elements', 0, 'elements', 0, 'grid', 'span']);
	});

	test('a span set only from a breakpoint that names its columns is accepted', () => {
		const sized = formWith([field('a', { responsive: { md: { span: 2 } } })], {
			columns: 'auto',
			responsive: { md: { columns: 6 } },
		});
		expect(() => engine.validateForm(sized)).not.toThrow();
	});

	test('a span from the default slot is still reported while the columns are auto below the breakpoint', () => {
		const form = formWith([field('a', { span: 2 })], { columns: 'auto', responsive: { md: { columns: 6 } } });
		expect(only(form).path).toEqual(['steps', 0, 'elements', 0, 'grid', 'span']);
	});
});
