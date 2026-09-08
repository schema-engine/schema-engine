import { describe, expect, test } from 'vitest';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createFormEngine } from '@/engine/create-form-engine';
import { FormValidationError } from '@/lib/validate-form';

type MinimalFixtureConfig = {
	id: string;
	name: string;
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
					'name' in value &&
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

describe('native Standard Schema engine path', () => {
	test('createFormEngine -> defineForm accepts a hand-written Standard Schema', () => {
		const engine = createFormEngine({
			elements: [
				{
					$type: 'minimal-fixture',
					schema: createMinimalStandardSchema(),
					metadata: { name: 'Minimal fixture', category: 'input' },
					render: () => null,
				},
			],
		});

		const config = engine.defineForm({
			id: 'native-ss',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'minimal-fixture', id: 'field-1', name: 'field-1' }],
				},
			],
		});

		expect(config.steps[0]?.elements[0]).toMatchObject({ $type: 'minimal-fixture', id: 'field-1' });
		expect(() => engine.generateJSONSchemaCollection()).not.toThrow();
		expect(() => engine.generateFormConfigSchema()).not.toThrow();
	});

	test('rejects invalid native Standard Schema configs with a registration error', () => {
		const engine = createFormEngine({
			elements: [
				{
					$type: 'minimal-fixture',
					schema: createMinimalStandardSchema(),
					metadata: { name: 'Minimal fixture', category: 'input' },
					render: () => null,
				},
			],
		});

		expect(() =>
			engine.validateForm({
				id: 'native-ss-bad',
				steps: [
					{
						id: 'main',
						title: 'Main',
						elements: [{ $type: 'minimal-fixture', id: 'field-1' }],
					},
				],
			}),
		).toThrow(FormValidationError);

		try {
			engine.validateForm({
				id: 'native-ss-bad',
				steps: [
					{
						id: 'main',
						title: 'Main',
						elements: [{ $type: 'minimal-fixture', id: 'field-1' }],
					},
				],
			});
		} catch (error) {
			expect(error).toBeInstanceOf(FormValidationError);
			expect((error as FormValidationError).message).toMatch(
				/steps\[0\] \(id: 'main'\) elements\[0\] \(id: 'field-1'\).*Invalid element configuration for 'minimal-fixture'/s,
			);
			expect((error as FormValidationError).message).not.toMatch(/\.run/);
		}
	});
});
