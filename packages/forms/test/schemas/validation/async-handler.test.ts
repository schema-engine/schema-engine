import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAsyncValidationHandler } from '../../../src/schemas/validation/async/handler';
import { createValidationContext } from '../../../src/schemas/validation/utils';

describe('createAsyncValidationHandler HTTP method', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify({ valid: true }), { status: 200 }));
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	test('uses GET without request body', async () => {
		const schema = createAsyncValidationHandler(
			{
				type: 'async',
				url: '/api/check',
				method: 'GET',
				disableCache: true,
			},
			createValidationContext(),
		);

		await schema.parseAsync('test-value');

		expect(fetchSpy).toHaveBeenCalled();
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(init.method).toBe('GET');
		expect(init.body).toBeUndefined();
		expect(init.headers).not.toHaveProperty('Content-Type');
	});

	test('defaults to POST with JSON body', async () => {
		const schema = createAsyncValidationHandler(
			{
				type: 'async',
				url: '/api/check',
				disableCache: true,
			},
			createValidationContext(),
		);

		await schema.parseAsync('test-value');

		expect(fetchSpy).toHaveBeenCalled();
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(init.method).toBe('POST');
		expect(init.body).toBe(JSON.stringify({ value: 'test-value' }));
		expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
	});
});

describe('createAsyncValidationHandler dependencies', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify({ valid: true }), { status: 200 }));
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	function readPayload(): Record<string, unknown> {
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		return JSON.parse(init.body as string) as Record<string, unknown>;
	}

	test('resolves a dotted dependency from the form root', async () => {
		const schema = createAsyncValidationHandler(
			{ type: 'async', url: '/api/check', dependencies: ['billing.country'], disableCache: true },
			createValidationContext({ values: { billing: { country: 'it' } }, fieldPath: 'vat' }),
		);

		await schema.parseAsync('IT01');

		expect(readPayload().dependsOn).toEqual({ 'billing.country': 'it' });
	});

	test('resolves a bare dependency within the declaring array row', async () => {
		const schema = createAsyncValidationHandler(
			{ type: 'async', url: '/api/check', dependencies: ['accountType'], disableCache: true },
			createValidationContext({
				values: { contacts: [{ accountType: 'personal' }, { accountType: 'business' }] },
				fieldPath: 'contacts.1.email',
			}),
		);

		await schema.parseAsync('jane@example.com');

		expect(readPayload().dependsOn).toEqual({ accountType: 'business' });
	});

	test('skips the request while a dependency is unfilled', async () => {
		const schema = createAsyncValidationHandler(
			{ type: 'async', url: '/api/check', dependencies: ['accountType'], disableCache: true },
			createValidationContext({ values: {}, fieldPath: 'contacts.1.email' }),
		);

		await schema.parseAsync('jane@example.com');

		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
