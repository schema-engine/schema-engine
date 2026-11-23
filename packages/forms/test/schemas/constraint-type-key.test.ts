import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { BaseFieldSchema, ConstraintLogicSchema, StepConstraintSchema } from '@/schemas/base-field';
import { defineInput } from '@/types';
import { anyValue } from '../lib/any-value';

const plan = { field: 'plan', operator: 'equals', value: 'team' } as const;

describe('a constraint is discriminated by $type', () => {
	test('accepts every behaviour as the $type of a field constraint', () => {
		for (const $type of ['show', 'hide', 'enable', 'disable', 'require']) {
			expect(z.safeParse(ConstraintLogicSchema, { ...plan, $type }).success).toBe(true);
		}
	});

	test('rejects a field constraint written with `action`, at the `$type` key', () => {
		const result = z.safeParse(ConstraintLogicSchema, { ...plan, action: 'show' });

		expect(result.success).toBe(false);
		expect(!result.success && result.error.issues.map((issue) => issue.path)).toEqual([['$type']]);
	});

	test('accepts show and hide as the $type of a step constraint, and refuses the rest', () => {
		expect(z.safeParse(StepConstraintSchema, { ...plan, $type: 'show' }).success).toBe(true);
		expect(z.safeParse(StepConstraintSchema, { ...plan, $type: 'hide' }).success).toBe(true);
		expect(z.safeParse(StepConstraintSchema, { ...plan, $type: 'require' }).success).toBe(false);
	});

	test('rejects a step constraint written with `action`, at the `$type` key', () => {
		const result = z.safeParse(StepConstraintSchema, { ...plan, action: 'hide' });

		expect(result.success).toBe(false);
		expect(!result.success && result.error.issues.map((issue) => issue.path)).toEqual([['$type']]);
	});
});

describe('the JSON Schema export of a constraint', () => {
	const field = defineInput({
		value: anyValue,
		$type: 'field',
		schema: z.extend(BaseFieldSchema, { $type: z.literal('field') }),
		metadata: { name: 'Field', category: 'input' },
		render: () => null,
	});

	type JsonSchema = { properties?: Record<string, { enum?: string[] }>; required?: string[] };

	test('names the behaviour `$type` and has no `action`', () => {
		const document = createFormEngine({ elements: [field] }).generateFormConfigSchema() as unknown as {
			$defs: Record<string, { properties: { constraints: { items: JsonSchema } } }>;
		};
		const constraint = document.$defs['element:field']?.properties.constraints.items;

		expect(constraint?.properties?.$type?.enum).toEqual(['show', 'hide', 'enable', 'disable', 'require']);
		expect(constraint?.properties).not.toHaveProperty('action');
		expect(constraint?.required).toContain('$type');
	});
});
