import { describe, expect, test } from 'vitest';
import { renderToString } from '@ecopages/jsx/server';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import * as z from 'zod/mini';
import { createFormEngine, type ElementRenderProps, type ConstraintLogic } from '@schema-engine/forms';
import { FormInstance } from '@/components/form-instance';
import { FormElements } from '@/components/internals/form-elements';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { anyValue } from '../lib/any-value';

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
			elements: [
				{
					$type: 'probe',
					kind: 'input',
					schema,
					value: anyValue,
					metadata: { name: 'Probe', category: 'input' },
					render,
				},
			],
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
								{ field: 'accountType', operator: 'equals', value: 'business', $type: 'show' },
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
					kind: 'input',
					value: anyValue,
					schema,
					metadata: { name: 'Probe', category: 'input' },
					render: (config: z.infer<typeof schema>) => jsx('input', { name: config.name }),
				},
				{
					$type: 'group',
					kind: 'input',
					childPaths: [{ keys: ['elements'] }],
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
										{ field: 'accountType', operator: 'equals', value: 'business', $type: 'show' },
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
		['a constraint', { constraints: [{ field: 'mode', operator: 'equals', value: 'lock', $type: 'disable' }] }],
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
			{ constraints: [{ field: 'mode', operator: 'equals', value: 'need', $type: 'require' }] },
			{},
		],
		[
			'a fieldset',
			'address.city',
			{},
			{ constraints: [{ field: 'mode', operator: 'equals', value: 'need', $type: 'require' }] },
		],
		[
			'an outer fieldset',
			'address.inner.city',
			{},
			{
				constraints: [{ field: 'mode', operator: 'equals', value: 'need', $type: 'require' }],
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

describe('SSR participation', () => {
	test('a field whose show condition reads a skipped step is hidden in the server markup, as the client container will say', () => {
		const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
		const input = (name: string, extra: Record<string, unknown> = {}) => ({
			$type: 'input',
			id: name,
			name,
			...extra,
		});
		const config = engine.validateForm({
			id: 'ssr-skip',
			steps: [
				{ id: 'one', title: 'One', elements: [input('hasCompany', { defaultValue: 'no' })] },
				{
					id: 'company',
					title: 'Company',
					constraints: [{ field: 'hasCompany', operator: 'equals', value: 'yes', $type: 'show' }],
					elements: [input('wants', { defaultValue: 'yes' })],
				},
				{
					id: 'payment',
					title: 'Payment',
					elements: [
						input('vat', {
							constraints: [{ field: 'wants', operator: 'equals', value: 'yes', $type: 'show' }],
						}),
					],
				},
			],
		});
		const html = renderToString(jsx(RecipeRenderer, { config, engine, recipe: undefined }));
		expect(html).toMatch(/data-se-constraint-field="vat"[^>]*hidden|hidden[^>]*data-se-constraint-field="vat"/);
	});
});

describe('standalone element constraints', () => {
	test('an element rendered outside a form render is hidden by its own hide constraint, through the same participation', async () => {
		const { FormElement } = await import('@/components/internals/field-renderer');
		const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
		const element = engine.validateElement({
			$type: 'input',
			id: 'ref',
			name: 'ref',
			constraints: [{ field: 'mode', operator: 'equals', value: 'hide', $type: 'hide' }],
		});
		const render = (mode: string) =>
			renderToString(jsx(FormElement, { config: element, engine, name: 'ref', values: { mode } }));
		expect(render('hide')).toMatch(
			/data-se-constraint-field="ref"[^>]*hidden|hidden[^>]*data-se-constraint-field="ref"/,
		);
		expect(render('show')).not.toMatch(/<se-constraint[^>]* hidden/);
	});
});
