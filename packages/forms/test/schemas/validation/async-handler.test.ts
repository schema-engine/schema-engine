import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAsyncValidationHandler } from '../../../src/schemas/validation/async/handler';

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
		const schema = createAsyncValidationHandler({
			type: 'async',
			url: '/api/check',
			method: 'GET',
			disableCache: true,
		});

		await schema.parseAsync('test-value');

		expect(fetchSpy).toHaveBeenCalled();
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(init.method).toBe('GET');
		expect(init.body).toBeUndefined();
		expect(init.headers).not.toHaveProperty('Content-Type');
	});

	test('defaults to POST with JSON body', async () => {
		const schema = createAsyncValidationHandler({
			type: 'async',
			url: '/api/check',
			disableCache: true,
		});

		await schema.parseAsync('test-value');

		expect(fetchSpy).toHaveBeenCalled();
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(init.method).toBe('POST');
		expect(init.body).toBe(JSON.stringify({ value: 'test-value' }));
		expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
	});
});
