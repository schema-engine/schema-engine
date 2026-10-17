import { describe, expect, test } from 'vitest';
import { renderToString } from '@ecopages/jsx/server';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import * as z from 'zod/mini';
import { createFormEngine, type ElementRenderProps } from '@schema-engine/forms';
import type { ConstraintLogic } from '@schema-engine/forms/schemas';
import { FormInstance } from '@/components/form-instance';
import { FormElements } from '@/components/internals/form-elements';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

const schema = z.object({
	$type: z.literal('probe'),
	id: z.string(),
	name: z.string(),
	defaultValue: z.optional(z.string()),
	constraints: z.optional(z.custom<ConstraintLogic[]>()),
});

describe('SSR constraint snapshot', () => {
	test('SSR constraint snapshot uses default values', () => {
		const render = (config: z.infer<typeof schema>) => jsx('input', { name: config.name });
		const engine = createFormEngine({
			elements: [{ $type: 'probe', schema, metadata: { name: 'Probe', category: 'input' }, render }],
		});
		const config = engine.defineForm({
			id: 'business',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{ $type: 'probe', id: 'accountType', name: 'accountType', defaultValue: 'business' },
						{
							$type: 'probe',
							id: 'vatNumber',
							name: 'vatNumber',
							constraints: [
								{ field: 'accountType', operator: 'equals', value: 'business', action: 'show' },
							],
						},
					],
				},
			],
		});
		const html = renderToString(jsx(RecipeRenderer, { config, engine, recipe: undefined }));
		expect(html).toMatch(/data-se-constraint-field="vatNumber"/);
		expect(html).not.toMatch(/hidden/);
	});
	test('caller defaults cross the form instance boundary and reach unconstrained containers', () => {
		const containerSchema = z.object({
			$type: z.literal('group'),
			id: z.string(),
			name: z.string(),
			elements: z.array(schema),
		});
		const engine = createFormEngine({
			elements: [
				{
					$type: 'probe',
					schema,
					metadata: { name: 'Probe', category: 'input' },
					render: (config: z.infer<typeof schema>) => jsx('input', { name: config.name }),
				},
				{
					$type: 'group',
					schema: containerSchema,
					metadata: { name: 'Group', category: 'layout' },
					render: (config: ElementRenderProps<typeof containerSchema>) =>
						jsx(FormElements, { elements: config.elements, namePrefix: config.name }),
				},
			],
		});
		const config = engine.defineForm({
			id: 'override',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{
							$type: 'group',
							id: 'group',
							name: 'group',
							elements: [
								{ $type: 'probe', id: 'accountType', name: 'accountType', defaultValue: 'personal' },
								{
									$type: 'probe',
									id: 'vatNumber',
									name: 'vatNumber',
									constraints: [
										{ field: 'accountType', operator: 'equals', value: 'business', action: 'show' },
									],
								},
							],
						},
					],
				},
			],
		});
		const html = renderToString(
			jsx(FormInstance, { config, engine, defaultValues: { group: { accountType: 'business' } } }),
		);
		expect(html).toMatch(/data-se-constraint-field="group.vatNumber"/);
		expect(html).not.toMatch(/hidden/);
	});

	test.each([
		['an authored', { disabled: true }],
		['a constraint', { constraints: [{ field: 'mode', operator: 'equals', value: 'lock', action: 'disable' }] }],
	])('%s disabled fieldset renders its children disabled', (_, fieldSet) => {
		const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
		const config = engine.validateForm({
			id: 'disabled-fieldset',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{ $type: 'input', id: 'mode', name: 'mode', defaultValue: 'lock' },
						{
							$type: 'fieldSet',
							id: 'address',
							name: 'address',
							elements: [{ $type: 'input', id: 'city', name: 'city' }],
							...fieldSet,
						},
					],
				},
			],
		});
		const html = renderToString(jsx(FormInstance, { config, engine }));
		const fieldHost = (name: string) =>
			html
				.split('<se-field')
				.find((field) => field.includes(`name="${name}"`))
				?.split('>')[0];
		expect(fieldHost('address.city')).toMatch(/\sdisabled/);
		expect(fieldHost('mode')).not.toMatch(/\sdisabled/);
	});

	test.each([
		[
			'its own',
			'city',
			{ constraints: [{ field: 'mode', operator: 'equals', value: 'need', action: 'require' }] },
			{},
		],
		[
			'a fieldset',
			'address.city',
			{},
			{ constraints: [{ field: 'mode', operator: 'equals', value: 'need', action: 'require' }] },
		],
		[
			'an outer fieldset',
			'address.inner.city',
			{},
			{
				constraints: [{ field: 'mode', operator: 'equals', value: 'need', action: 'require' }],
				elements: [
					{
						$type: 'fieldSet',
						id: 'inner',
						name: 'inner',
						elements: [{ $type: 'input', id: 'city', name: 'city', label: 'City' }],
					},
				],
			},
		],
	])('a field required by %s require constraint shows its marker at render', (_, name, field, fieldSet) => {
		const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
		const config = engine.validateForm({
			id: 'required-at-render',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{ $type: 'input', id: 'mode', name: 'mode', label: 'Mode' },
						{ $type: 'input', id: 'city', name: 'city', label: 'City', ...field },
						{
							$type: 'fieldSet',
							id: 'address',
							name: 'address',
							elements: [{ $type: 'input', id: 'city', name: 'city', label: 'City' }],
							...fieldSet,
						},
					],
				},
			],
		});
		const marker = (mode: string) =>
			renderToString(jsx(FormInstance, { config, engine, defaultValues: { mode } }))
				.split('<se-field')
				.find((host) => host.includes(`name="${name}"`))
				?.match(/<span data-se-required-marker[^>]*>/)?.[0];
		expect(marker('need')).not.toMatch(/hidden/);
		expect(marker('open')).toMatch(/hidden/);
	});
});
