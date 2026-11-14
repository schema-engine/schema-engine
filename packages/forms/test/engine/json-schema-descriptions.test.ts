import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { BaseFieldSchema } from '@/schemas/base-field';
import { defineInput } from '@/types';

type Schema = Record<string, unknown>;

const described = defineInput({
	$type: 'described',
	schema: z.extend(BaseFieldSchema, {
		$type: z.literal('described'),
		maxLength: z.optional(z.number().check(z.describe('Longest value accepted.'))),
		pattern: z.optional(z.string().check(z.meta({ description: 'Regular expression the value must match.' }))),
	}),
	metadata: { name: 'Described', category: 'input' },
	render: () => null,
});

function elementProperties(schema: Schema): Record<string, Schema> {
	const defs = schema.$defs as Record<string, Schema>;
	return defs['element:described'].properties as Record<string, Schema>;
}

describe('generateFormConfigSchema descriptions', () => {
	test('keeps descriptions set with describe and meta on element properties', () => {
		const engine = createFormEngine({ elements: [described] });
		const properties = elementProperties(engine.generateFormConfigSchema());

		expect(properties.maxLength.description).toBe('Longest value accepted.');
		expect(properties.pattern.description).toBe('Regular expression the value must match.');
	});
});
