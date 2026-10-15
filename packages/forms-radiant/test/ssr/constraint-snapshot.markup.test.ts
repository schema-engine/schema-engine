import { describe, expect, test, vi } from 'vitest';
import { renderToString } from '@ecopages/jsx/server';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import * as z from 'zod/mini';
import { createFormEngine } from '@schema-engine/forms';
import { evaluateConstraints } from '@schema-engine/forms/constraints';
import type { ConstraintLogic } from '@schema-engine/forms/schemas';
import { FormInstance } from '@/components/form-instance';
import { FormElements } from '@/components/internals/form-elements';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';

vi.mock('@schema-engine/forms/constraints', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@schema-engine/forms/constraints')>();
	return { ...actual, evaluateConstraints: vi.fn(actual.evaluateConstraints) };
});

const schema = z.object({
	$type: z.literal('probe'),
	id: z.string(),
	name: z.string(),
	defaultValue: z.optional(z.string()),
	constraints: z.optional(z.custom<ConstraintLogic[]>()),
});

describe('SSR constraint snapshot', () => {
	test('SSR constraint snapshot uses default values', () => {
		vi.mocked(evaluateConstraints).mockClear();
		const render = vi.fn((config: z.infer<typeof schema>) => jsx('input', { name: config.name }));
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
		expect(render).toHaveBeenCalledTimes(2);
		expect(evaluateConstraints).toHaveBeenCalledTimes(2);
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
					render: (config: z.infer<typeof containerSchema>) =>
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
});
