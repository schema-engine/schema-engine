import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineInput } from '@/types';
import { ElementGridConfigSchema } from '@/schemas/base-field';

const field = defineInput({
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

interface PatternNode {
	pattern?: string;
}

interface JsonSchemaShape {
	$defs: Record<string, { properties: { grid: { properties: { area: PatternNode } } } }>;
	properties: {
		grid: { properties: { areas: { anyOf: Array<{ items?: PatternNode }> } } };
		steps: {
			items: { properties: { grid: { properties: { areas: { anyOf: Array<{ items?: PatternNode }> } } } } };
		};
	};
}

function exported() {
	const schema = createFormEngine({ elements: [field] }).generateFormConfigSchema() as unknown as JsonSchemaShape;
	const name = schema.$defs['element:field']?.properties.grid.properties.area.pattern;
	const row = schema.properties.grid.properties.areas.anyOf[0]?.items?.pattern;
	const stepRow = schema.properties.steps.items.properties.grid.properties.areas.anyOf[0]?.items?.pattern;
	if (!name || !row || !stepRow) throw new Error('Expected the area patterns in the exported JSON Schema');
	return { name: new RegExp(name), row: new RegExp(row), stepRow: new RegExp(stepRow) };
}

describe('exported JSON Schema for grid areas', () => {
	test.each([['Street'], ['Area2'], ['side-2'], ['auto-x'], ['Autonomy']])('accepts the area name %s', (name) => {
		const patterns = exported();
		expect(patterns.name.test(name)).toBe(true);
		expect(patterns.row.test(`${name} .`)).toBe(true);
		expect(patterns.stepRow.test(`${name} .`)).toBe(true);
	});

	test.each([['auto'], ['AUTO'], ['Default'], ['Span'], ['NONE'], ['Revert-Layer'], ['inherit'], ['a;b'], ['1a']])(
		'rejects the area name %j',
		(name) => {
			const patterns = exported();
			expect(patterns.name.test(name)).toBe(false);
			expect(patterns.row.test(`${name} b`)).toBe(false);
		},
	);

	test('an empty name is rejected', () => {
		expect(exported().name.test('')).toBe(false);
	});

	test('the exported patterns agree with the Zod schema', () => {
		const patterns = exported();
		for (const name of ['Street', 'AUTO', 'Default', 'zip-code', 'a;b', 'span']) {
			expect(patterns.name.test(name)).toBe(ElementGridConfigSchema.safeParse({ area: name }).success);
		}
	});
});
