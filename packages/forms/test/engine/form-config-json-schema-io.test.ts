import * as z from 'zod/mini';
import { describe, expect, test } from 'vitest';
import { createFormEngine } from '@/engine/create-form-engine';
import { BaseFieldSchema } from '@/schemas/base-field';

const pipedSchema = z.pipe(
	z.extend(BaseFieldSchema, { $type: z.literal('piped'), length: z.optional(z._default(z.number(), 6)) }),
	z.transform((config) => ({ ...config, normalized: true })),
);

const engine = createFormEngine({
	elements: [
		{
			$type: 'piped',
			schema: pipedSchema,
			metadata: { name: 'Piped', category: 'input' },
			render: () => null,
		},
	],
});

describe('generateFormConfigSchema with an element that pipes a transform', () => {
	test('returns a schema without options', () => {
		const schema = engine.generateFormConfigSchema();

		expect(schema.$id).toBe('form-config-schema');
		expect(schema.$defs['element:piped']?.type).toBe('object');
	});

	test('describes the authored side, where a defaulted field is optional', () => {
		const schema = engine.generateFormConfigSchema();

		expect(schema.$defs['element:piped']?.required ?? []).not.toContain('length');
	});

	test('output mode still throws, since a transform has no JSON Schema for its output', () => {
		expect(() => engine.generateFormConfigSchema({ io: 'output' })).toThrow(/Transforms cannot be represented/);
	});
});
