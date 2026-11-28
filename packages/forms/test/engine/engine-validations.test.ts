import { afterEach, describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { validateFormValues } from '@/engine/value-validation';
import { createDebounceScope } from '@/lib/debounce';
import { logger } from '@/lib/logger';
import { defineInput, type AnyElementRegistration } from '@/types';
import type { ValidationRegistrationConstraint } from '@/schemas/validation/types';
import { anyValue } from '../lib/any-value';

type PostcodeRule = { $type: 'postcode'; message?: string };

/** A custom rule written the way the docs show it: `$type`, a rule schema, metadata and a handler. */
const postcode = {
	$type: 'postcode',
	schema: z.object({ $type: z.literal('postcode'), message: z.optional(z.string()) }),
	metadata: { name: 'Postcode', description: 'A UK-style postcode.' },
	category: 'string',
	handler: (rule: PostcodeRule) =>
		z.string().check(z.regex(/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/, rule.message ?? 'Invalid postcode')),
} as const;

function declaring($type: string, validation: { $type: string; handler: () => z.ZodMiniType }): AnyElementRegistration {
	return defineInput({
		value: anyValue,
		$type,
		schema: z.object({ $type: z.literal($type), name: z.string() }),
		metadata: { name: $type, category: 'input' },
		render: () => null,
		validations: [
			{
				...validation,
				schema: z.looseObject({ $type: z.literal(validation.$type) }),
				metadata: { name: validation.$type },
				category: 'generic',
			},
		],
	});
}

function schemaFor(engine: ReturnType<typeof createFormEngine>, rule: { $type: string }) {
	return engine.validations.createSchema(rule, {
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
		const registry = createFormEngine({ validations: [postcode] }).validations;

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

		expect(schemaFor(engine, { $type: 'shared-rule' })?.safeParse(42).success).toBe(true);
		expect(schemaFor(engine, { $type: 'shared-rule' })?.safeParse('text').success).toBe(false);
		const logged = spies.flatMap((spy) => spy.mock.calls.map((call) => JSON.stringify(call)));
		expect(logged.filter((entry) => entry.includes('shared-rule') || entry.includes('already registered'))).toEqual(
			[],
		);
	});

	test('reports the message of a custom rule passed to the engine', async () => {
		const engine = createFormEngine({ validations: [postcode] });
		const elements = [
			{ $type: 'input', name: 'postcode', rules: [{ $type: 'postcode', message: 'Enter a postcode' }] },
		];

		const invalid = await validateFormValues({
			steps: [{ elements }],
			values: { postcode: 'nope' },
			registry: engine.validations,
			debounceScope: createDebounceScope(),
		});
		const valid = await validateFormValues({
			steps: [{ elements }],
			values: { postcode: 'SW1A 1AA' },
			registry: engine.validations,
			debounceScope: createDebounceScope(),
		});

		expect(invalid.issues).toEqual({
			postcode: [{ type: 'postcode', message: 'Enter a postcode', severity: 'error' }],
		});
		expect(valid.issues).toEqual({});
	});

	test('lets an engine validation override one an element declares', () => {
		const element = declaring('input-a', { $type: 'postcode', handler: () => z.number() });
		const engine = createFormEngine({ elements: [element], validations: [postcode] });

		expect(schemaFor(engine, { $type: 'postcode' })?.safeParse('SW1A 1AA').success).toBe(true);
	});

	test('keeps the same winning element validation when the engine is extended with no options', () => {
		const a1 = declaring('input-a', { $type: 'x', handler: () => z.number() });
		const b = declaring('input-b', { $type: 'x', handler: () => z.string() });
		const a2 = declaring('input-a', { $type: 'x', handler: () => z.boolean() });

		const built = createFormEngine({ elements: [a1, b, a2] });
		const extended = built.extend();

		const accepts = (engine: typeof built) =>
			[true, 'text', 42].map((value) => schemaFor(engine, { $type: 'x' })?.safeParse(value).success);
		expect(accepts(extended)).toEqual(accepts(built));
		expect(accepts(extended)).toEqual([false, true, false]);
	});

	test('freezes the default rules a field type receives', () => {
		const phone = declaring('phone-input', { $type: 'phone', handler: () => z.string() });
		const registry = createFormEngine({
			elements: [phone],
			validations: [{ ...postcode, $type: 'phone', defaultFor: ['phone-input'] }],
		}).validations;

		const rules = registry.getDefaultRulesForFieldType('phone-input');
		expect(rules).toEqual([{ $type: 'phone' }]);
		expect(Object.isFrozen(rules)).toBe(true);
		expect(Object.isFrozen(rules[0])).toBe(true);
		expect(registry.getDefaultRulesForFieldType('no-such-type')).toEqual([]);
	});

	test('does not see validations added to the list after the engine is built', () => {
		const list: ValidationRegistrationConstraint[] = [postcode];
		const engine = createFormEngine({ validations: list });
		list.push({ ...postcode, $type: 'late-rule' });

		expect(engine.extend().validations.has('late-rule')).toBe(false);
	});

	test('keeps engine validations when the engine is extended', () => {
		const engine = createFormEngine({ validations: [postcode] }).extend({
			elements: [declaring('extra-input', { $type: 'extra-rule', handler: () => z.string() })],
		});

		expect(engine.validations.has('postcode')).toBe(true);
		expect(engine.validations.has('extra-rule')).toBe(true);
	});

	test('adds validations given to extend', () => {
		const engine = createFormEngine().extend({ validations: [postcode] });

		expect(engine.validations.has('postcode')).toBe(true);
	});

	test('rejects a validation whose schema is not a Standard Schema', () => {
		expect(() =>
			createFormEngine({
				validations: [{ ...postcode, schema: {} } as unknown as typeof postcode],
			}),
		).toThrow("Validation 'postcode' schema must implement Standard Schema");
	});
});
