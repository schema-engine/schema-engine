import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAsyncValidationHandler } from '../../../src/schemas/validation/async/handler';
import { createValidationContext } from '../../../src/schemas/validation/utils';
import { globalFetch } from '../../../src/lib/form-fetch';
import { createDebounceScope } from '../../../src/lib/debounce';
import { REPORTED_TEXT, ValidationSuperseded, ValidationUnavailable } from '../../../src/schemas/validation/errors';

const contextWithFetch = (...input: Parameters<typeof createValidationContext>) => ({
	...createValidationContext(...input),
	fetch: globalFetch,
});

describe('createAsyncValidationHandler HTTP method', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => new Response(JSON.stringify({ valid: true }), { status: 200 }));
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
			contextWithFetch(),
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
			contextWithFetch(),
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
			.mockImplementation(async () => new Response(JSON.stringify({ valid: true }), { status: 200 }));
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
			contextWithFetch({ values: { billing: { country: 'it' } }, fieldPath: 'vat' }),
		);

		await schema.parseAsync('IT01');

		expect(readPayload().dependsOn).toEqual({ 'billing.country': 'it' });
	});

	test('resolves a bare dependency within the declaring array row', async () => {
		const schema = createAsyncValidationHandler(
			{ type: 'async', url: '/api/check', dependencies: ['accountType'], disableCache: true },
			contextWithFetch({
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
			contextWithFetch({ values: {}, fieldPath: 'contacts.1.email' }),
		);

		await schema.parseAsync('jane@example.com');

		expect(fetchSpy).not.toHaveBeenCalled();
	});

	test('skips empty arrays but validates false and zero values', async () => {
		const schema = createAsyncValidationHandler(
			{ type: 'async', url: '/api/check', disableCache: true },
			contextWithFetch(),
		);

		await schema.parseAsync([]);
		await schema.parseAsync(false);
		await schema.parseAsync(0);

		expect(fetchSpy).toHaveBeenCalledTimes(2);
		const calls = fetchSpy.mock.calls as [string, RequestInit][];
		const payloads = calls.map(([, init]) => JSON.parse(init.body as string));
		expect(payloads).toEqual([{ value: false }, { value: 0 }]);
	});
});

describe('createAsyncValidationHandler debounce', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.useFakeTimers();
		fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => new Response(JSON.stringify({ valid: true }), { status: 200 }));
	});

	afterEach(() => {
		fetchSpy.mockRestore();
		vi.useRealTimers();
	});

	test('a superseded async validation never passes submission', async () => {
		const schema = createAsyncValidationHandler(
			{ type: 'async', url: '/api/check', debounce: 300, disableCache: true },
			contextWithFetch({ fieldPath: 'email' }),
		);

		const first = schema.safeParseAsync('first@example.com');
		await vi.advanceTimersByTimeAsync(100);
		const second = schema.safeParseAsync('second@example.com');

		await expect(first).rejects.toBeInstanceOf(ValidationSuperseded);
		await vi.advanceTimersByTimeAsync(300);
		await expect(second).resolves.toMatchObject({ success: true });

		expect(fetchSpy).toHaveBeenCalledOnce();
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(init.body as string)).toEqual({ value: 'second@example.com' });
	});

	test('a superseded parse of the same value shares the latest request result', async () => {
		fetchSpy.mockImplementation(
			async () => new Response(JSON.stringify({ valid: false, message: 'Email is taken' }), { status: 200 }),
		);
		const schema = createAsyncValidationHandler(
			{ type: 'async', url: '/api/check', debounce: 300, disableCache: true },
			contextWithFetch({ fieldPath: 'email' }),
		);

		const first = schema.safeParseAsync('taken@example.com');
		await vi.advanceTimersByTimeAsync(100);
		const second = schema.safeParseAsync('taken@example.com');
		await vi.advanceTimersByTimeAsync(300);

		const messages = (await Promise.all([first, second])).map((result) => {
			const issue = result.error?.issues[0];
			return issue?.code === 'custom' ? issue.params?.[REPORTED_TEXT] : undefined;
		});
		expect(messages).toEqual(['Email is taken', 'Email is taken']);
		expect(fetchSpy).toHaveBeenCalledOnce();
	});

	test('a same-value parse replaced again by a different value does not pass', async () => {
		const schema = createAsyncValidationHandler(
			{ type: 'async', url: '/api/check', debounce: 300, disableCache: true },
			contextWithFetch({ fieldPath: 'email' }),
		);

		const first = schema.safeParseAsync('same@example.com');
		const second = schema.safeParseAsync('same@example.com');
		const third = schema.safeParseAsync('other@example.com');
		const outcomes = Promise.allSettled([first, second, third]);
		await vi.advanceTimersByTimeAsync(300);

		const settled = await outcomes;
		expect(settled.map(({ status }) => status)).toEqual(['rejected', 'rejected', 'fulfilled']);
		expect(settled[0]).toMatchObject({ reason: expect.any(ValidationSuperseded) });
		expect(settled[2]).toMatchObject({ value: { success: true } });
		expect(fetchSpy).toHaveBeenCalledOnce();
	});

	test('separate validation contexts do not cancel each other', async () => {
		const debounceScope = createDebounceScope();
		const firstSchema = createAsyncValidationHandler(
			{ type: 'async', url: '/api/check', debounce: 300, disableCache: true },
			contextWithFetch({ fieldPath: 'first', debounceScope }),
		);
		const secondSchema = createAsyncValidationHandler(
			{ type: 'async', url: '/api/check', debounce: 300, disableCache: true },
			contextWithFetch({ fieldPath: 'second', debounceScope }),
		);
		const first = firstSchema.safeParseAsync('one');
		const second = secondSchema.safeParseAsync('two');

		await vi.advanceTimersByTimeAsync(300);
		await expect(Promise.all([first, second])).resolves.toMatchObject([{ success: true }, { success: true }]);
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});
});

describe('AsyncRuleSchema', () => {
	test('an expected response carries valid, success, message and error, and no rule identity', async () => {
		const { AsyncRuleSchema } = await import('../../../src/schemas/validation/types');
		const parsed = AsyncRuleSchema.parse({
			type: 'async',
			url: '/x',
			expectedResponse: { valid: true, message: 'm', id: 'nope', severity: 'warning' },
		});

		expect(parsed.expectedResponse).toEqual({ valid: true, message: 'm' });
	});
});

describe('createAsyncValidationHandler answers', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	afterEach(() => fetchSpy.mockRestore());

	const run = (rule: Partial<Parameters<typeof createAsyncValidationHandler>[0]>, value = 'v') =>
		createAsyncValidationHandler(
			{ type: 'async', url: '/answers', ...rule },
			contextWithFetch({ fieldPath: 'f' }),
		).safeParseAsync(value);
	const answer = (body: unknown) => {
		fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => new Response(JSON.stringify(body), { status: 200 }));
	};

	test.each([{}, null, 'ok', { message: 'hm' }, { valid: 'yes' }, 1])(
		'an answer of %j is no answer: it throws ValidationUnavailable and is never cached',
		async (body) => {
			answer(body);
			await expect(run({}, `v-${JSON.stringify(body)}`)).rejects.toBeInstanceOf(ValidationUnavailable);
			await expect(run({}, `v-${JSON.stringify(body)}`)).rejects.toBeInstanceOf(ValidationUnavailable);
			expect(fetchSpy).toHaveBeenCalledTimes(2);
		},
	);

	test('a boolean, or an object with a boolean valid or success, is an answer', async () => {
		answer(false);
		expect((await run({}, 'a')).success).toBe(false);
		answer({ success: true });
		expect((await run({}, 'b')).success).toBe(true);
		answer({ valid: false, success: true });
		expect((await run({}, 'c')).success).toBe(false);
	});

	test('an expected response is compared structurally, whatever the key order', async () => {
		answer({ success: true, valid: true });
		expect((await run({ expectedResponse: { valid: true, success: true }, disableCache: true })).success).toBe(
			true,
		);
		answer({ valid: true, success: true, extra: 1 });
		expect((await run({ expectedResponse: { valid: true, success: true }, disableCache: true })).success).toBe(
			false,
		);
	});
});
