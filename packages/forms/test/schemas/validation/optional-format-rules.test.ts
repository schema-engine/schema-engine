import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import {
	createDefaultValidationRegistry,
	createValidationContext,
	createZodSchemaFromRules,
	createValidationRegistry,
	defaultValidations,
} from '../../../src/schemas/validation/';

const registry = createDefaultValidationRegistry();

/** The message of the first issue the rules raise for a value, or `undefined` when the value is valid. */
function errorFor(rules: Array<{ type: string } & Record<string, unknown>>, value: unknown) {
	const schema = createZodSchemaFromRules(rules, createValidationContext(), registry);
	const result = z.safeParse(schema, value);
	return result.success ? undefined : result.error.issues[0]?.message;
}

const formatRules = [
	{ type: 'email', message: 'Bad email' },
	{ type: 'url', message: 'Bad url' },
	{ type: 'pattern', value: '^[a-z]+$', message: 'Bad pattern' },
	{ type: 'minLength', value: 3, message: 'Too short' },
	{ type: 'phone', message: 'Bad phone' },
	{ type: 'uuid', message: 'Bad uuid' },
	{ type: 'date', message: 'Bad date' },
] as const;

describe('a format rule on an optional field', () => {
	test.each(formatRules)('$type accepts an empty string and undefined', (rule) => {
		expect(errorFor([{ ...rule }], '')).toBeUndefined();
		expect(errorFor([{ ...rule }], undefined)).toBeUndefined();
	});

	test.each([
		[{ type: 'email', message: 'Bad email' }, 'not-an-email', 'Bad email'],
		[{ type: 'url', message: 'Bad url' }, 'nope', 'Bad url'],
		[{ type: 'pattern', value: '^[a-z]+$', message: 'Bad pattern' }, '123', 'Bad pattern'],
		[{ type: 'minLength', value: 3, message: 'Too short' }, 'ab', 'Too short'],
		[{ type: 'phone', message: 'Bad phone' }, '12', 'Bad phone'],
	])('%j still checks a filled value', (rule, value, message) => {
		expect(errorFor([rule], value)).toBe(message);
	});

	test('a filled value that is valid passes', () => {
		expect(errorFor([{ type: 'email' }], 'a@b.co')).toBeUndefined();
	});
});

describe('a format rule on a required field', () => {
	test.each(formatRules)('$type still rejects an empty string once the field is required', (rule) => {
		expect(errorFor([{ type: 'required', message: 'Required' }, { ...rule }], '')).toBe('Required');
		expect(errorFor([{ type: 'required', message: 'Required' }, { ...rule }], undefined)).toBe('Required');
	});

	test('the order of the rules does not matter', () => {
		expect(errorFor([{ type: 'email' }, { type: 'required', message: 'Required' }], '')).toBe('Required');
	});
});

describe('rules that are not formats', () => {
	test('minItems still rejects an empty list, since the author asked for items', () => {
		expect(errorFor([{ type: 'minItems', value: 1, message: 'Pick one' }], [])).toBe('Pick one');
	});

	test('a registration in the string category is skipped for an empty value too', () => {
		const custom = createValidationRegistry([
			...defaultValidations,
			{
				$type: 'postcode',
				schema: z.object({ type: z.literal('postcode') }),
				metadata: { name: 'Postcode' },
				category: 'string',
				handler: () => z.string().check(z.regex(/^\d{5}$/, 'Bad postcode')),
			},
		]);
		const schema = createZodSchemaFromRules([{ type: 'postcode' }], createValidationContext(), custom);

		expect(z.safeParse(schema, '').success).toBe(true);
		expect(z.safeParse(schema, '12').success).toBe(false);
	});
});
