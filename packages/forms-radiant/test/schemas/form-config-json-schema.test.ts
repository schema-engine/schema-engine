import { describe, expect, test } from 'vitest';
import { createRadiantFormEngine } from '@/registries';
import { schemaFormRegistrations } from '@/registrations';

describe('form config JSON Schema export with the Radiant elements', () => {
	test('generates by default although input-otp pipes a transform', () => {
		const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

		const schema = engine.generateFormConfigSchema();

		expect(schema.$id).toBe('form-config-schema');
		expect(JSON.stringify(schema)).toContain('input-otp');
	});
});
