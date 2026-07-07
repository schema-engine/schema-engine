import { describe, expect, test } from 'bun:test';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { safeParseStandardSchema } from '@schema-engine/forms/lib/standard-schema';

type MinimalFixtureConfig = {
	id: string;
	$type: 'minimal-fixture';
};

function createMinimalStandardSchema(): StandardSchemaV1<MinimalFixtureConfig> {
	return {
		'~standard': {
			version: 1,
			vendor: 'schema-engine-test',
			validate(value) {
				if (
					typeof value === 'object' &&
					value !== null &&
					'id' in value &&
					'$type' in value &&
					(value as MinimalFixtureConfig).$type === 'minimal-fixture'
				) {
					return { value: value as MinimalFixtureConfig };
				}

				return { issues: [{ message: 'Invalid minimal-fixture config' }] };
			},
		},
	};
}

describe('standard schema boundary fixture', () => {
	test('validates a hand-written Standard Schema without Zod', () => {
		const schema = createMinimalStandardSchema();

		const valid = safeParseStandardSchema(schema, { id: 'field-1', $type: 'minimal-fixture' });
		const invalid = safeParseStandardSchema(schema, { id: 'field-1', $type: 'wrong' });

		expect(valid.success).toBe(true);
		if (valid.success) {
			expect(valid.data.$type).toBe('minimal-fixture');
		}

		expect(invalid.success).toBe(false);
	});
});
