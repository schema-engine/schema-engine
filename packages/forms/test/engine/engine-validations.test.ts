import { afterEach, describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { validateFormValues } from '@/engine/value-validation';
import { createDebounceScope } from '@/lib/debounce';
import { logger } from '@/lib/logger';
import { defineInput } from '@/types';

type PostcodeRule = { type: 'postcode'; message?: string };

/** A custom rule written the way the docs show it: `$type`, a rule schema, metadata and a handler. */
const postcode = {
	$type: 'postcode',
	schema: z.object({ type: z.literal('postcode'), message: z.optional(z.string()) }),
	metadata: { name: 'Postcode', description: 'A UK-style postcode.' },
	category: 'string',
	handler: (rule: PostcodeRule) =>
		z.string().check(z.regex(/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/, rule.message ?? 'Invalid postcode')),
} as const;

function declaring(
	$type: string,
	validation: { $type: string; handler: () => z.ZodMiniType },
): ReturnType<typeof defineInput> {
	return defineInput({
		$type,
		schema: z.object({ $type: z.literal($type), name: z.string() }),
		metadata: { name: $type, category: 'input' },
		render: () => null,
		validations: [
			{
				...validation,
				schema: z.looseObject({ type: z.literal(validation.$type) }),
				metadata: { name: validation.$type },
				category: 'generic',
			},
		],
	});
}

function schemaFor(engine: ReturnType<typeof createFormEngine>, rule: { type: string }) {
	return engine.getValidationRegistry().createSchema(rule, {
		values: {},
		fieldPath: '',
		resolve: () => undefined,
		debounceScope: createDebounceScope(),
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('engine validation registry', () => {
	test('stores the rules in a read-only registry with no register or clear', () => {
		const registry = createFormEngine({ validations: [postcode] }).getValidationRegistry();

		expect(registry.kind).toBe('Validation');
		expect(registry.has('postcode')).toBe(true);
		expect(registry.has('required')).toBe(true);
		expect(registry.get('postcode')?.$type).toBe('postcode');
		for (const method of ['register', 'registerMultiple', 'unregister', 'clear']) {
			expect(registry).not.toHaveProperty(method);
		}
	});

	test('uses the later validation of a type and logs nothing', () => {
		const spies = (['debug', 'info', 'warn', 'error'] as const).map((level) => vi.spyOn(logger, level));
		const first = declaring('first-input', { $type: 'shared-rule', handler: () => z.string() });
		const second = declaring('second-input', { $type: 'shared-rule', handler: () => z.number() });

		const engine = createFormEngine({ elements: [first, second] });

		expect(schemaFor(engine, { type: 'shared-rule' })?.safeParse(42).success).toBe(true);
		expect(schemaFor(engine, { type: 'shared-rule' })?.safeParse('text').success).toBe(false);
		const logged = spies.flatMap((spy) => spy.mock.calls.map((call) => JSON.stringify(call)));
		expect(logged.filter((entry) => entry.includes('shared-rule') || entry.includes('already registered'))).toEqual(
			[],
		);
	});

	test('reports the message of a custom rule passed to the engine', async () => {
		const engine = createFormEngine({ validations: [postcode] });
		const elements = [
			{ $type: 'input', name: 'postcode', rules: [{ type: 'postcode', message: 'Enter a postcode' }] },
		];

		const invalid = await validateFormValues({
			elements,
			values: { postcode: 'nope' },
			registry: engine.getValidationRegistry(),
			debounceScope: createDebounceScope(),
		});
		const valid = await validateFormValues({
			elements,
			values: { postcode: 'SW1A 1AA' },
			registry: engine.getValidationRegistry(),
			debounceScope: createDebounceScope(),
		});

		expect(invalid).toEqual({ postcode: { type: 'validation', message: 'Enter a postcode' } });
		expect(valid).toEqual({});
	});

	test('lets an engine validation override one an element declares', () => {
		const element = declaring('input-a', { $type: 'postcode', handler: () => z.number() });
		const engine = createFormEngine({ elements: [element], validations: [postcode] });

		expect(schemaFor(engine, { type: 'postcode' })?.safeParse('SW1A 1AA').success).toBe(true);
	});

	test('keeps engine validations when the engine is extended', () => {
		const engine = createFormEngine({ validations: [postcode] }).extend({
			elements: [declaring('extra-input', { $type: 'extra-rule', handler: () => z.string() })],
		});

		expect(engine.getValidationRegistry().has('postcode')).toBe(true);
		expect(engine.getValidationRegistry().has('extra-rule')).toBe(true);
	});

	test('adds validations given to extend', () => {
		const engine = createFormEngine().extend({ validations: [postcode] });

		expect(engine.getValidationRegistry().has('postcode')).toBe(true);
	});

	test('rejects a validation whose schema is not a Standard Schema', () => {
		expect(() =>
			createFormEngine({
				validations: [{ ...postcode, schema: {} } as unknown as typeof postcode],
			}),
		).toThrow("Validation 'postcode' schema must implement Standard Schema");
	});
});
