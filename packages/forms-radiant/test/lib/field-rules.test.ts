import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createDefaultValidationRegistry } from '@schema-engine/forms/schemas/validation';
import { toFieldRules } from '@/lib/field-rules';
import { createRadiantPhoneValidationRegistration } from '@/lib/phone-validation';

const registry = createDefaultValidationRegistry();

describe('toFieldRules', () => {
	test('maps required and delegates email to the engine registry', async () => {
		const rules = toFieldRules(
			{
				rules: [
					{ type: 'required', message: 'Name is required' },
					{ type: 'email', message: 'Invalid email' },
				],
			},
			registry,
		);

		expect(rules?.required).toBe('Name is required');
		expect(rules?.pattern).toBeUndefined();
		const validate = rules?.validate as (value: unknown) => Promise<boolean | string>;
		expect(await validate('jane@example.com')).toBe(true);
		expect(await validate('not-an-email')).toBe('Invalid email');
	});

	test('returns undefined when a field has no rules', () => {
		expect(toFieldRules({}, registry)).toBeUndefined();
		expect(toFieldRules({ rules: [] }, registry)).toBeUndefined();
	});

	test('uses the phone validator for complete numbers', async () => {
		const phoneRegistry = createDefaultValidationRegistry([createRadiantPhoneValidationRegistration()]);
		const rules = toFieldRules({ rules: [{ type: 'phone' }] }, phoneRegistry);
		expect(typeof rules?.validate).toBe('function');

		const validate = rules?.validate as (value: unknown) => Promise<boolean | string>;
		expect(await validate('+44')).toBe('Enter a complete phone number');
		expect(await validate('+442079460958')).toBe(true);
	});

	test('uses the shared validation registry for URL and IPv4 rules', async () => {
		const urlRules = toFieldRules({ rules: [{ type: 'url', message: 'Enter a valid URL' }] }, registry);
		const ipv4Rules = toFieldRules({ rules: [{ type: 'ipv4', message: 'Enter a valid IPv4 address' }] }, registry);

		const validateUrl = urlRules?.validate as (value: unknown) => Promise<boolean | string>;
		const validateIpv4 = ipv4Rules?.validate as (value: unknown) => Promise<boolean | string>;
		expect(await validateUrl('not-a-url')).toBe('Enter a valid URL');
		expect(await validateUrl('https://schema-engine.dev')).toBe(true);
		expect(await validateIpv4('127.0.0.999')).toBe('Enter a valid IPv4 address');
		expect(await validateIpv4('127.0.0.1')).toBe(true);
	});

	test('uses the shared validation registry for Base64 and hexadecimal rules', async () => {
		const base64Rules = toFieldRules({ rules: [{ type: 'base64', message: 'Enter Base64 data' }] }, registry);
		const hexadecimalRules = toFieldRules(
			{ rules: [{ type: 'hex', message: 'Enter hexadecimal characters' }] },
			registry,
		);
		const validateBase64 = base64Rules?.validate as (value: unknown) => Promise<boolean | string>;
		const validateHex = hexadecimalRules?.validate as (value: unknown) => Promise<boolean | string>;
		expect(await validateBase64('not base64')).toBe('Enter Base64 data');
		expect(await validateBase64('aGVsbG8=')).toBe(true);
		expect(await validateHex('not hexadecimal')).toBe('Enter hexadecimal characters');
		expect(await validateHex('deadbeef')).toBe(true);
	});

	test('validates minItems as an array rule rather than a required field', async () => {
		const rules = toFieldRules(
			{ rules: [{ type: 'minItems', value: 2, message: 'Add at least two contacts' }] },
			registry,
		);
		const validate = rules?.validate as (value: unknown) => Promise<boolean | string>;

		expect(rules?.required).toBeUndefined();
		expect(await validate([{ name: 'Alice' }])).toBe('Add at least two contacts');
		expect(await validate([{ name: 'Alice' }, { name: 'Bob' }])).toBe(true);
	});

	test('injects phone validation for phone-input when the author omitted the rule', async () => {
		const phoneRegistry = createDefaultValidationRegistry([createRadiantPhoneValidationRegistration()]);
		const rules = toFieldRules({ $type: 'phone-input' }, phoneRegistry);
		expect(typeof rules?.validate).toBe('function');

		const validate = rules?.validate as (value: unknown) => Promise<boolean | string>;
		expect(await validate('+44')).toBe('Enter a complete phone number');
		expect(await validate('+442079460958')).toBe(true);
	});

	describe('cross-field context', () => {
		let fetchSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			fetchSpy = vi
				.spyOn(globalThis, 'fetch')
				.mockResolvedValue(new Response(JSON.stringify({ valid: true }), { status: 200 }));
		});

		afterEach(() => {
			fetchSpy.mockRestore();
		});

		test('resolves a reference against the rendered row using the form values', async () => {
			const rules = toFieldRules(
				{
					rules: [
						{
							type: 'async',
							url: '/api/check',
							method: 'POST',
							dependencies: ['accountType'],
							disableCache: true,
						},
					],
					name: 'contacts.1.email',
				},
				registry,
			);

			const validate = rules?.validate as (
				value: unknown,
				values: Record<string, unknown>,
			) => Promise<boolean | string>;
			await validate('jane@example.com', {
				contacts: [{ accountType: 'personal' }, { accountType: 'business' }],
				'contacts.0.accountType': 'personal',
				'contacts.1.accountType': 'business',
			});

			const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
			expect(JSON.parse(init.body as string)).toEqual({
				value: 'jane@example.com',
				dependsOn: { accountType: 'business' },
			});
		});
	});
});
