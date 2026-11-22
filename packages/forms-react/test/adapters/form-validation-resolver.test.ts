import { describe, expect, test, vi } from 'vitest';
import { createFormEngine, createDefaultValidationRegistry } from '@schema-engine/forms';
import { PhoneInputElementRegistration } from '@/components/schema-engine/forms/inputs/form-phone-input.registration';
import { createFormValidationResolver } from '../../src/adapters/rhf/hooks/use-form-validation-resolver';

const elements = [
	{
		name: 'firstName',
		rules: [{ type: 'required', message: 'First name is required' }],
	},
	{
		name: 'email',
		rules: [{ type: 'email', message: 'Please enter a valid email address' }],
	},
];

const registry = createDefaultValidationRegistry();

/** A rule with options, as the resolver's element type has no place to write them down. */
function loose(rule: Record<string, unknown> & { type: string }): { type: string } {
	return rule;
}

describe('createFormValidationResolver', () => {
	test('validates every field when names are omitted', async () => {
		const resolver = createFormValidationResolver(elements, registry);
		const resolved = await resolver({ firstName: '', email: 'nope' }, undefined, {
			fields: {},
			shouldUseNativeValidation: false,
		});

		expect(resolved.errors).toMatchObject({
			firstName: { message: 'First name is required' },
			email: { message: 'Please enter a valid email address' },
		});
	});

	test('lets an optional field with only a format rule stay empty', async () => {
		const resolver = createFormValidationResolver(elements, registry);
		const resolved = await resolver({ firstName: 'Ada', email: '' }, undefined, {
			fields: {},
			shouldUseNativeValidation: false,
		});

		expect(resolved.errors).toEqual({});
	});

	test('validates only requested fields so later steps stay untriggered', async () => {
		const resolver = createFormValidationResolver(elements, registry);
		const resolved = await resolver({ firstName: '', email: '' }, undefined, {
			fields: {},
			names: ['firstName'],
			shouldUseNativeValidation: false,
		});

		expect(resolved.errors).toMatchObject({
			firstName: { message: 'First name is required' },
		});
		expect(resolved.errors).not.toHaveProperty('email');
	});

	test('returns nested field errors for RHF revalidation', async () => {
		const resolver = createFormValidationResolver(
			[
				{
					name: 'address',
					elements: [{ name: 'street', rules: [{ type: 'required', message: 'Street is required' }] }],
				},
			],
			registry,
		);
		const resolved = await resolver({ address: { street: '' } }, undefined, {
			fields: {},
			shouldUseNativeValidation: false,
		});
		expect(resolved.errors).toEqual({ address: { street: { type: 'required', message: 'Street is required' } } });
	});

	test('rejects a phone country prefix while accepting a complete international number', async () => {
		const engine = createFormEngine({ elements: [PhoneInputElementRegistration] });
		const resolver = createFormValidationResolver(
			[
				{
					$type: 'phone-input',
					id: 'phone',
					name: 'phone',
				},
			],
			engine.getValidationRegistry(),
		);
		const options = { fields: {}, shouldUseNativeValidation: false };

		const incomplete = await resolver({ phone: '+44' }, undefined, options);
		expect(incomplete.errors).toMatchObject({
			phone: { type: 'phone' },
		});

		const complete = await resolver({ phone: '+442079460958' }, undefined, options);
		expect(complete.errors).toEqual({});
	});

	test('isolates debounced requests between resolver instances sharing a registry', async () => {
		vi.useFakeTimers();
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => new Response(JSON.stringify({ valid: true }), { status: 200 }));
		const asyncElements = [
			{
				name: 'email',
				rules: [{ type: 'async', url: '/api/check', debounce: 300, disableCache: true }],
			},
		];
		const firstResolver = createFormValidationResolver(asyncElements, registry);
		const secondResolver = createFormValidationResolver(asyncElements, registry);
		const options = { fields: {}, shouldUseNativeValidation: false };

		try {
			const first = firstResolver({ email: 'first@example.com' }, undefined, options);
			const second = secondResolver({ email: 'second@example.com' }, undefined, options);
			await vi.advanceTimersByTimeAsync(300);
			await Promise.all([first, second]);

			expect(fetchSpy).toHaveBeenCalledTimes(2);
		} finally {
			fetchSpy.mockRestore();
			vi.useRealTimers();
		}
	});

	test('a check replaced by a later write waits for the latest run and shows its real outcome', async () => {
		vi.useFakeTimers();
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(
				async () => new Response(JSON.stringify({ valid: false, message: 'Handle is taken' }), { status: 200 }),
			);
		try {
			const resolver = createFormValidationResolver(
				[
					{
						name: 'handle',
						rules: [loose({ type: 'async', url: '/check', debounce: 100, disableCache: true })],
					},
				],
				registry,
			);
			const options = { fields: {}, shouldUseNativeValidation: false, names: ['handle'] };
			const first = resolver({ handle: 'a' }, undefined, options);
			await vi.advanceTimersByTimeAsync(20);
			const second = resolver({ handle: 'ab' }, undefined, options);
			await vi.advanceTimersByTimeAsync(20);
			const submit = resolver({ handle: 'ab' }, undefined, { ...options, names: undefined });
			await vi.advanceTimersByTimeAsync(300);

			const results = await Promise.all([first, second, submit]);
			for (const result of results) {
				expect(result.errors).toEqual({ handle: { type: 'async', message: 'Handle is taken' } });
			}
			expect(JSON.stringify(results)).not.toMatch(/pending/i);
		} finally {
			fetchSpy.mockRestore();
			vi.useRealTimers();
		}
	});

	test('a call superseded by another re-runs its own scope and values, not the other call outcome', async () => {
		vi.useFakeTimers();
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => new Response(JSON.stringify({ valid: true }), { status: 200 }));
		try {
			const resolver = createFormValidationResolver(
				[
					{ name: 'name', rules: [{ type: 'required' }] },
					{
						name: 'email',
						rules: [loose({ type: 'async', url: '/check', debounce: 30, disableCache: true })],
					},
				],
				registry,
			);
			const options = { fields: {}, shouldUseNativeValidation: false };
			const submit = resolver({ name: '', email: 'a@x.io' }, undefined, { ...options, names: undefined });
			await vi.advanceTimersByTimeAsync(5);
			const field = resolver({ name: '', email: 'b@x.io' }, undefined, { ...options, names: ['email'] });
			await vi.advanceTimersByTimeAsync(500);
			const [submitted, single] = await Promise.all([submit, field]);

			expect(Object.keys(submitted.errors)).toEqual(['name']);
			expect(submitted.values).toEqual({});
			expect(single.errors).toEqual({});
			expect(single.values).toEqual({ name: '', email: 'b@x.io' });
		} finally {
			fetchSpy.mockRestore();
			vi.useRealTimers();
		}
	});

	test('a rule that could not run blocks with a reserved type of its own and no message, never the type of the rule', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => new Response('no', { status: 503 }));
		try {
			const resolver = createFormValidationResolver(
				[
					{
						name: 'handle',
						rules: [loose({ type: 'async', url: '/check', disableCache: true })],
					},
					{ name: 'code', rules: [loose({ type: 'pattern', value: '(' })] },
				],
				registry,
			);
			const resolved = await resolver({ handle: 'a', code: 'b' }, undefined, {
				fields: {},
				shouldUseNativeValidation: false,
				names: undefined,
			});

			expect(resolved.errors).toEqual({
				handle: { type: 'validationUnavailable' },
				code: { type: 'validationError' },
			});
		} finally {
			fetchSpy.mockRestore();
		}
	});
});
