import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { BaseFieldSchema } from '@/schemas/base-field';
import type { ValidationRegistration } from '@/schemas/validation';
import { createFormStateContainer } from '@/state-container';
import { defineInput } from '@/types';

type PostalCodeRule = { type: 'postalCode'; country?: 'us' | 'ca'; message?: string };

const postalCode: ValidationRegistration<PostalCodeRule> = {
	$type: 'postalCode',
	schema: z.looseObject({ type: z.literal('postalCode'), country: z.optional(z.enum(['us', 'ca'])) }),
	metadata: { name: 'Postal code' },
	category: 'string',
	handler: (rule) =>
		z.string().check(z.regex(rule.country === 'ca' ? /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/ : /^\d{5}(?:-\d{4})?$/)),
	params: (rule) => ({ country: rule.country ?? 'us' }),
};

/** An element that only extends the base field: the shape every element starts from. */
const text = defineInput({
	$type: 'text',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('text') }),
	metadata: { name: 'Text', category: 'input' },
	render: () => null,
});

const engine = createFormEngine({ elements: [text], validations: [postalCode] });

const formWith = (rules: unknown[]) => ({
	id: 'address',
	steps: [
		{
			id: 'main',
			title: 'Address',
			elements: [{ $type: 'text', id: 'zip', name: 'zip', rules }],
		},
	],
});

describe('a rule type registered with the engine, used in the rules of an element that extends BaseFieldSchema', () => {
	test('is accepted and keeps the options its registration declares', () => {
		const config = engine.defineForm({
			id: 'address',
			steps: [
				{
					id: 'main',
					title: 'Address',
					elements: [
						{
							$type: 'text',
							id: 'zip',
							name: 'zip',
							rules: [
								{ type: 'required' },
								{ type: 'postalCode', country: 'ca', id: 'zip-format', message: 'Not a postal code' },
							],
						},
					],
				},
			],
		});

		expect(config.steps[0]?.elements[0]).toMatchObject({
			rules: [
				{ type: 'required' },
				{ type: 'postalCode', country: 'ca', id: 'zip-format', message: 'Not a postal code' },
			],
		});
	});

	test('runs: the container reports its issue for a value it refuses and none for one it accepts', async () => {
		const config = engine.validateForm(formWith([{ type: 'postalCode', country: 'ca', id: 'zip-format' }]));
		const container = createFormStateContainer({
			config,
			registry: engine.getValidationRegistry(),
			defaults: { zip: 'not a code' },
		});

		expect(await container.validate()).toEqual({ outcome: 'invalid' });
		expect(container.getSnapshot().errors['zip']).toMatchObject({
			type: 'postalCode',
			ruleId: 'zip-format',
			params: { country: 'ca' },
		});

		container.setValue('zip', 'K1A 0B1');
		expect(await container.validate()).toEqual({ outcome: 'passed' });
	});

	test('is checked against its own schema, at the option at fault', () => {
		const result = engine.safeValidateForm(formWith([{ type: 'postalCode', country: 'mx' }]));

		expect(result.success).toBe(false);
		expect(!result.success && result.issues.map((issue) => issue.path)).toEqual([
			['steps', 0, 'elements', 0, 'rules', 0, 'country'],
		]);
	});

	test('is accepted by an engine built with it and rejected by one built without it', () => {
		const without = createFormEngine({ elements: [text] });

		expect(without.safeValidateForm(formWith([{ type: 'postalCode' }])).success).toBe(false);
		expect(engine.safeValidateForm(formWith([{ type: 'postalCode' }])).success).toBe(true);
	});
});

describe('a rule type nothing registers', () => {
	test('is rejected with a message that names it, the engine option and the registered types', () => {
		const result = engine.safeValidateForm(formWith([{ type: 'postalcode' }]));

		expect(result.success).toBe(false);
		expect(!result.success && result.issues).toEqual([
			{
				path: ['steps', 0, 'elements', 0, 'rules', 0, 'type'],
				message: expect.stringMatching(
					/^Unknown validation rule 'postalcode'\. Register it with createFormEngine\(\{ validations: \[\.\.\.\] \}\)\. Registered rules: required, .*postalCode\.$/,
				),
			},
		]);
	});

	test('is rejected in a standalone element too', () => {
		expect(() =>
			engine.validateElement({ $type: 'text', id: 'zip', name: 'zip', rules: [{ type: 'nope' }] }),
		).toThrow(/Unknown validation rule 'nope'/);
	});
});

describe('a built-in rule', () => {
	test('keeps its typed options: a wrong one is refused at its key', () => {
		const result = engine.safeValidateForm(formWith([{ type: 'minLength', value: 'eight' }]));

		expect(result.success).toBe(false);
		expect(!result.success && result.issues.map((issue) => issue.path)).toEqual([
			['steps', 0, 'elements', 0, 'rules', 0, 'value'],
		]);
	});

	test('a registration that replaces it decides its options, extra ones included', () => {
		const replaced = createFormEngine({
			elements: [text],
			validations: [
				{
					$type: 'minLength',
					schema: z.object({
						type: z.literal('minLength'),
						value: z.number(),
						unit: z.enum(['chars', 'words']),
					}),
					metadata: { name: 'Minimum length' },
					category: 'string',
					handler: (rule: { type: 'minLength'; value: number; unit: 'chars' | 'words' }) =>
						z.string().check(z.minLength(rule.value)),
				},
			],
		});

		const config = replaced.validateForm(formWith([{ type: 'minLength', value: 3, unit: 'words' }]));
		expect(config.steps[0]?.elements[0]).toMatchObject({ rules: [{ type: 'minLength', value: 3, unit: 'words' }] });

		const refused = replaced.safeValidateForm(formWith([{ type: 'minLength', value: 3, unit: 'bytes' }]));
		expect(!refused.success && refused.issues.map((issue) => issue.path)).toEqual([
			['steps', 0, 'elements', 0, 'rules', 0, 'unit'],
		]);
		expect(replaced.safeValidateForm(formWith([{ type: 'minLength', value: 3 }])).success).toBe(false);
	});

	test('keeps the defaults its registration applies', () => {
		const config = engine.validateForm(formWith([{ type: 'relate', fields: ['other'], assert: 'allEqual' }]));

		expect(config.steps[0]?.elements[0]).toMatchObject({
			rules: [{ type: 'relate', includeSelf: true, as: 'auto', skipWhenIncomplete: true }],
		});
	});
});

describe('a rule whose registration describes its options with a plain object', () => {
	const zip: ValidationRegistration<{ type: 'zip'; country: 'us' }> = {
		$type: 'zip',
		schema: z.object({ type: z.literal('zip'), country: z._default(z.enum(['us', 'ca']), 'us') }),
		metadata: { name: 'Zip' },
		category: 'string',
		handler: () => z.string().check(z.regex(/^\d{5}$/)),
	};
	const zipEngine = createFormEngine({ elements: [text], validations: [zip] });
	const authored = { type: 'zip', id: 'zip-id', message: 'Bad zip', severity: 'warning' };

	test('keeps the fields every rule has, and the defaults of its registration', () => {
		const config = zipEngine.validateForm(formWith([authored]));

		expect(config.steps[0]?.elements[0]).toMatchObject({ rules: [{ ...authored, country: 'us' }] });
	});

	test('keeps a warning a warning when the container runs it', async () => {
		const container = createFormStateContainer({
			config: zipEngine.validateForm(formWith([authored])),
			registry: zipEngine.getValidationRegistry(),
			defaults: { zip: 'abc' },
		});

		expect(await container.validate()).toEqual({ outcome: 'passed' });
		expect(container.getSnapshot().errors).toEqual({});
		expect(container.getSnapshot().warnings['zip']).toMatchObject({
			type: 'zip',
			ruleId: 'zip-id',
			message: 'Bad zip',
		});
	});

	test('refuses a common field of the wrong kind at its key, whatever the registration says', () => {
		const result = zipEngine.safeValidateForm(formWith([{ type: 'zip', severity: 'fatal' }]));

		expect(!result.success && result.issues.map((issue) => issue.path)).toEqual([
			['steps', 0, 'elements', 0, 'rules', 0, 'severity'],
		]);
	});
});

describe('the JSON Schema export of an element that extends BaseFieldSchema', () => {
	type JsonSchema = {
		$ref?: string;
		anyOf?: JsonSchema[];
		properties?: Record<string, JsonSchema & { const?: string }>;
		items?: JsonSchema;
	};
	type Document = { $defs: Record<string, JsonSchema> };

	const documentOf = (source: typeof engine) => source.generateFormConfigSchema() as unknown as Document;

	function ruleVariants(source: typeof engine): Map<string, JsonSchema> {
		const rules = documentOf(source).$defs['validation-rule'];
		return new Map(rules?.anyOf?.map((variant) => [variant.properties?.type?.const ?? '', variant]));
	}

	test('lists a custom rule with its options', () => {
		const country = ruleVariants(engine).get('postalCode');

		expect(country?.properties).toHaveProperty('country');
		expect(country?.properties?.country).toMatchObject({ enum: ['us', 'ca'] });
	});

	test('lists a built-in rule with its options', () => {
		expect(ruleVariants(engine).get('minLength')?.properties).toHaveProperty('value');
	});

	test('lists a built-in rule a registration replaces by the registration', () => {
		const replaced = createFormEngine({
			elements: [text],
			validations: [
				{
					$type: 'minLength',
					schema: z.object({ type: z.literal('minLength'), characters: z.number() }),
					metadata: { name: 'Minimum length' },
					category: 'string',
					handler: (rule: { type: 'minLength'; characters: number }) =>
						z.string().check(z.minLength(rule.characters)),
				},
			],
		});

		const minLength = ruleVariants(replaced).get('minLength');
		expect(minLength?.properties).toHaveProperty('characters');
		expect(minLength?.properties).not.toHaveProperty('value');
	});

	test('defines the rules once, and every element refers to that definition', () => {
		const elements = Array.from({ length: 6 }, (_, index) =>
			defineInput({
				$type: `text${index}`,
				schema: z.extend(BaseFieldSchema, { $type: z.literal(`text${index}`) }),
				metadata: { name: `Text ${index}`, category: 'input' },
				render: () => null,
			}),
		);
		const many = createFormEngine({ elements, validations: [postalCode] });
		const { $defs } = documentOf(many as unknown as typeof engine);

		expect(Object.keys($defs).filter((id) => id.startsWith('element:'))).toHaveLength(6);
		for (let index = 0; index < 6; index += 1) {
			const rules = $defs[`element:text${index}`]?.properties?.rules as JsonSchema | undefined;
			expect(rules?.items).toEqual({ $ref: '#/$defs/validation-rule' });
		}
		expect(Object.keys($defs).filter((id) => id === 'validation-rule')).toHaveLength(1);
		expect(JSON.stringify($defs).match(/"const":"postalCode"/g)).toHaveLength(1);
	});

	test('costs an element a reference, not the rule definition', () => {
		const { $defs } = documentOf(engine);
		const rules = JSON.stringify($defs['element:text']?.properties?.rules);
		const definition = JSON.stringify($defs['validation-rule']);

		expect(rules.length).toBeLessThan(definition.length / 20);
	});
});
