import { describe, expect, test } from 'vitest';
import { createRadiantFormEngine } from '@/registries';
import { schemaFormRegistrations } from '@/registrations';

describe('JSON Schema export with the Radiant elements', () => {
	const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

	test('the form config schema generates by default although input-otp pipes a transform', () => {
		const schema = engine.generateFormConfigSchema();

		expect(schema.$id).toBe('form-config-schema');
		expect(JSON.stringify(schema)).toContain('input-otp');
	});

	test('the schema collection generates by default too', () => {
		const collection = engine.generateJSONSchemaCollection();

		expect(JSON.stringify(collection)).toContain('input-otp');
	});
});
