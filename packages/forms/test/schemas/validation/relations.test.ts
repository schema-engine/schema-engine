import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import {
	createValidationContext,
	createZodSchemaFromRules,
	createDefaultValidationRegistry,
	ValidationPresets,
	type RelateRule,
} from '@/schemas/validation';

const BASE = { includeSelf: true, as: 'auto', skipWhenIncomplete: true } as const;
const registry = createDefaultValidationRegistry();

async function check(
	rule: RelateRule,
	value: unknown,
	values: Record<string, unknown> = {},
	fieldPath = 'confirmPassword',
): Promise<true | string | undefined> {
	const schema = createZodSchemaFromRules([rule], createValidationContext({ values, fieldPath }), registry);
	const result = await z.safeParseAsync(schema, value);
	return result.success ? true : result.error.issues[0]?.message;
}

describe('relate assertions', () => {
	test('allEqual passes matching values and reports a mismatch', async () => {
		const rule: RelateRule = { ...BASE, type: 'relate', fields: ['password'], assert: 'allEqual' };

		expect(await check(rule, 'hunter2', { password: 'hunter2' })).toBe(true);
		expect(await check(rule, 'hunter3', { password: 'hunter2' })).toBe('These fields must match');
	});

	test('allDifferent rejects a repeated value', async () => {
		const rule: RelateRule = { ...BASE, type: 'relate', fields: ['primary', 'secondary'], assert: 'allDifferent' };

		expect(await check(rule, 'c', { primary: 'a', secondary: 'b' })).toBe(true);
		expect(await check(rule, 'a', { primary: 'a', secondary: 'b' })).toBe('These fields must be different');
	});

	test('string comparison coerces primitives without coercing arbitrary objects', async () => {
		const rule: RelateRule = {
			...BASE,
			type: 'relate',
			fields: ['confirmation'],
			assert: 'allEqual',
			as: 'string',
		};
		const first = {
			toString: () => {
				throw new Error('unexpected conversion');
			},
		};
		const second = {
			toString: () => {
				throw new Error('unexpected conversion');
			},
		};

		expect(await check(rule, 42, { confirmation: '42' })).toBe(true);
		expect(await check(rule, first, { confirmation: second })).toBe('These fields must match');
	});

	test('ascending reads the declaring field first and allows equal neighbours', async () => {
		const ascending: RelateRule = {
			...BASE,
			type: 'relate',
			fields: ['ceiling'],
			assert: 'ascending',
			as: 'number',
		};
		const strict: RelateRule = { ...ascending, assert: 'strictlyAscending' };

		expect(await check(ascending, 4, { ceiling: 5 })).toBe(true);
		expect(await check(ascending, 5, { ceiling: 5 })).toBe(true);
		expect(await check(ascending, 6, { ceiling: 5 })).toBe('Values must be in ascending order');
		expect(await check(strict, 5, { ceiling: 5 })).toBe('Values must increase');
	});

	test('descending asserts the declaring field is the larger one', async () => {
		const rule: RelateRule = { ...BASE, type: 'relate', fields: ['floor'], assert: 'descending', as: 'number' };

		expect(await check(rule, 9, { floor: 5 })).toBe(true);
		expect(await check(rule, 1, { floor: 5 })).toBe('Values must be in descending order');
	});

	test('strictlyDescending rejects equal neighbours', async () => {
		const rule: RelateRule = {
			...BASE,
			type: 'relate',
			fields: ['floor'],
			assert: 'strictlyDescending',
			as: 'number',
		};

		expect(await check(rule, 5, { floor: 5 })).toBe('Values must decrease');
	});

	test('atLeastOne fires on a wholly empty group', async () => {
		const rule: RelateRule = {
			...BASE,
			type: 'relate',
			fields: ['phone', 'email'],
			assert: 'atLeastOne',
			includeSelf: false,
		};

		expect(await check(rule, '', { phone: '', email: 'jane@example.com' })).toBe(true);
		expect(await check(rule, '', { phone: '', email: '' })).toBe('Fill at least one of these fields');
	});

	test('emptiness treats empty arrays as empty and false or zero as filled', async () => {
		const rule: RelateRule = {
			...BASE,
			type: 'relate',
			fields: ['phone', 'email'],
			assert: 'atLeastOne',
			includeSelf: false,
		};

		expect(await check(rule, '', { phone: [], email: null })).toBe('Fill at least one of these fields');
		expect(await check(rule, '', { phone: false, email: null })).toBe(true);
		expect(await check(rule, '', { phone: 0, email: null })).toBe(true);
	});

	test('exactlyOne rejects both filled and neither filled', async () => {
		const rule: RelateRule = {
			...BASE,
			type: 'relate',
			fields: ['card', 'invoice'],
			assert: 'exactlyOne',
			includeSelf: false,
		};

		expect(await check(rule, '', { card: '4242', invoice: '' })).toBe(true);
		expect(await check(rule, '', { card: '4242', invoice: 'INV-1' })).toBe('Fill exactly one of these fields');
		expect(await check(rule, '', { card: '', invoice: '' })).toBe('Fill exactly one of these fields');
	});

	test('allOrNone accepts an empty group and a complete one', async () => {
		const rule: RelateRule = {
			...BASE,
			type: 'relate',
			fields: ['street', 'city'],
			assert: 'allOrNone',
			includeSelf: false,
		};

		expect(await check(rule, '', { street: '', city: '' })).toBe(true);
		expect(await check(rule, '', { street: 'Main', city: 'Rome' })).toBe(true);
		expect(await check(rule, '', { street: 'Main', city: '' })).toBe('Fill all of these fields or none');
	});
});

describe('relate semantics', () => {
	test('skipWhenIncomplete keeps a half-filled comparison quiet', async () => {
		const rule: RelateRule = { ...BASE, type: 'relate', fields: ['password'], assert: 'allEqual' };

		expect(await check(rule, 'hunter2', {})).toBe(true);
		expect(await check(rule, '', { password: 'hunter2' })).toBe(true);
	});

	test('two empty values do not count as matching while skipWhenIncomplete is on', async () => {
		const rule: RelateRule = { ...BASE, type: 'relate', fields: ['password'], assert: 'allEqual' };

		expect(await check(rule, '', { password: '' })).toBe(true);
		expect(await check({ ...rule, skipWhenIncomplete: false }, '', { password: '' })).toBe(true);
	});

	test('skipWhenIncomplete does not disarm the emptiness assertions', async () => {
		const atLeastOne: RelateRule = {
			...BASE,
			type: 'relate',
			fields: ['phone', 'email'],
			assert: 'atLeastOne',
			includeSelf: false,
		};

		expect(await check(atLeastOne, '', { phone: '', email: '' })).toBe('Fill at least one of these fields');
		expect(await check({ ...atLeastOne, assert: 'allOrNone' }, '', { phone: 'x', email: '' })).toBe(
			'Fill all of these fields or none',
		);
	});

	test('an unparseable date fails the comparison rather than passing it', async () => {
		const rule: RelateRule = { ...BASE, type: 'relate', fields: ['startDate'], assert: 'descending', as: 'date' };

		expect(await check(rule, '2026-02-01', { startDate: '2026-01-01' })).toBe(true);
		expect(await check(rule, 'not-a-date', { startDate: '2026-01-01' })).toBe('Values must be in descending order');
	});

	test('date comparison does not call an arbitrary object toString method', async () => {
		const rule: RelateRule = { ...BASE, type: 'relate', fields: ['startDate'], assert: 'descending', as: 'date' };
		const value = {
			toString: () => {
				throw new Error('unexpected conversion');
			},
		};

		expect(await check(rule, '2026-02-01', { startDate: value })).toBe('Values must be in descending order');
	});

	test('includeSelf false ignores the value under test even when it is listed', async () => {
		const rule: RelateRule = {
			...BASE,
			type: 'relate',
			fields: ['phone', 'email'],
			assert: 'atLeastOne',
			includeSelf: false,
		};

		expect(await check(rule, 'typed-but-not-committed', { phone: '', email: '' }, 'phone')).toBe(
			'Fill at least one of these fields',
		);
	});

	test('a reference inside an array row resolves within that row', async () => {
		const rule: RelateRule = { ...BASE, type: 'relate', fields: ['quantity'], assert: 'descending', as: 'number' };
		const values = { lines: [{ quantity: 2 }, { quantity: 10 }] };

		expect(await check(rule, 5, values, 'lines.0.max')).toBe(true);
		expect(await check(rule, 5, values, 'lines.1.max')).toBe('Values must be in descending order');
	});

	test('a custom message replaces the default', async () => {
		const rule: RelateRule = {
			...BASE,
			type: 'relate',
			fields: ['password'],
			assert: 'allEqual',
			message: 'Passwords must match',
		};

		expect(await check(rule, 'nope', { password: 'hunter2' })).toBe('Passwords must match');
	});
});

describe('relate presets', () => {
	test('matches builds an allEqual rule that includes the declaring field', async () => {
		const rule = ValidationPresets.relate.matches('password', 'Passwords must match');

		expect(rule).toMatchObject({ type: 'relate', fields: ['password'], assert: 'allEqual', includeSelf: true });
		expect(await check(rule, 'nope', { password: 'hunter2' })).toBe('Passwords must match');
	});

	test('after compares as dates', async () => {
		const rule = ValidationPresets.relate.after('startDate', 'End date must be after the start date');

		expect(await check(rule, '2026-03-01', { startDate: '2026-01-01' })).toBe(true);
		expect(await check(rule, '2025-12-01', { startDate: '2026-01-01' })).toBe(
			'End date must be after the start date',
		);
	});

	test('before compares as dates in the other direction', async () => {
		const rule = ValidationPresets.relate.before('endDate');

		expect(await check(rule, '2026-01-01', { endDate: '2026-03-01' })).toBe(true);
		expect(await check(rule, '2026-04-01', { endDate: '2026-03-01' })).toBe('Values must be in ascending order');
	});

	test('atLeastOneOf and mutuallyExclusive exclude the declaring field', async () => {
		expect(ValidationPresets.relate.atLeastOneOf(['phone', 'email']).includeSelf).toBe(false);
		expect(ValidationPresets.relate.mutuallyExclusive(['card', 'invoice']).includeSelf).toBe(false);
		expect(ValidationPresets.relate.allOrNone(['street', 'city']).includeSelf).toBe(false);
	});
});
