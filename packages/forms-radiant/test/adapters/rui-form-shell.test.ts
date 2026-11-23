import { describe, expect, test } from 'vitest';
import { collectFormInitialValues } from '@/adapters/radiant/rui-form-shell';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import * as z from 'zod/mini';
import { defineInput } from '@schema-engine/forms';
import { ArrayElementConfigSchema } from '@/elements/inputs/form-array-elements.types';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

function createArrayForm() {
	return engine.validateForm({
		id: 'array-defaults',
		title: 'Array defaults',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'arrayElements',
						id: 'contacts',
						name: 'contacts',
						label: 'Contacts',
						minItems: 2,
						initialValues: { role: 'Viewer' },
						elements: [
							{
								$type: 'input',
								inputType: 'text',
								id: 'role',
								name: 'role',
								label: 'Role',
								defaultValue: 'Guest',
							},
						],
					},
				],
			},
		],
	});
}

function createNestedArrayForm() {
	return engine.validateForm({
		id: 'nested-array-defaults',
		title: 'Nested array defaults',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'arrayElements',
						id: 'members',
						name: 'members',
						label: 'Members',
						minItems: 1,
						initialValues: { name: 'New member', roles: [{ role: 'Admin' }, { role: 'Editor' }] },
						elements: [
							{
								$type: 'input',
								inputType: 'text',
								id: 'name',
								name: 'name',
								label: 'Name',
							},
							{
								$type: 'arrayElements',
								id: 'roles',
								name: 'roles',
								label: 'Roles',
								minItems: 2,
								initialValues: { role: 'Viewer' },
								elements: [
									{
										$type: 'input',
										inputType: 'text',
										id: 'role',
										name: 'role',
										label: 'Role',
									},
								],
							},
						],
					},
				],
			},
		],
	});
}

describe('Radiant form initial values', () => {
	test('merges array initialValues over child defaults in every seeded row', () => {
		const values = collectFormInitialValues(createArrayForm());

		expect(values).toEqual({ contacts: [{ role: 'Viewer' }, { role: 'Viewer' }] });
	});

	test('seeds a custom array registration to minItems', () => {
		const repeater = defineInput({
			$type: 'repeater',
			containerKind: 'array',
			schema: z.extend(ArrayElementConfigSchema, { $type: z.literal('repeater') }),
			metadata: { name: 'Repeater', category: 'input' },
			render: () => null,
		});
		const customEngine = createRadiantFormEngine({ elements: [...schemaFormRegistrations, repeater] });
		const form = customEngine.validateForm({
			id: 'custom-array',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{
							$type: 'repeater',
							id: 'tags',
							name: 'tags',
							minItems: 2,
							elements: [{ $type: 'input', id: 'tag', name: 'tag', label: 'Tag' }],
						},
					],
				},
			],
		});

		expect(collectFormInitialValues(form)).toEqual({ tags: ['', ''] });
	});

	test('preserves provider rows and uses array initialValues for remaining minItems rows', () => {
		const values = collectFormInitialValues(createArrayForm(), {
			contacts: [{ role: 'Editor' }],
		});

		expect(values).toMatchObject({
			contacts: [{ role: 'Editor' }, { role: 'Viewer' }],
		});
	});

	test('preserves object row shape when minItems adds rows to provider defaults', () => {
		const form = engine.validateForm({
			id: 'object-array-defaults',
			title: 'Object array defaults',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{
							$type: 'arrayElements',
							id: 'members',
							name: 'members',
							label: 'Members',
							minItems: 2,
							initialValues: { role: '' },
							elements: [
								{
									$type: 'input',
									inputType: 'text',
									id: 'role',
									name: 'role',
									label: 'Role',
								},
							],
						},
					],
				},
			],
		});
		const values = collectFormInitialValues(form, { members: [{ role: 'Admin' }] });

		expect(values).toEqual({ members: [{ role: 'Admin' }, { role: '' }] });
	});

	test('preserves nested rows supplied by a parent array initialValues object', () => {
		const values = collectFormInitialValues(createNestedArrayForm());

		expect(values).toMatchObject({
			members: [{ name: 'New member', roles: [{ role: 'Admin' }, { role: 'Editor' }] }],
		});
	});
});
