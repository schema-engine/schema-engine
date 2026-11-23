import { afterEach, describe, expect, test, vi } from 'vitest';
import { csrf, csrfFieldFor } from '@/csrf';
import { buildFormActionContext, createFormEngine } from '@/index';
import { formSubmitPlugin, type FormSubmitAction } from '@/actions/plugins/form-submit.plugin';
import { createValidationContext } from '@/schemas/validation';
import { createMockBuilderContext } from '../actions/__tools';

const TOKEN_HEADER = 'X-CSRF-Token';
const own = 'https://app.example.com';

const policy = (token: () => string | undefined = () => 'secret') =>
	csrf.custom({ token, header: TOKEN_HEADER, field: '_csrf' });

/** A request function that records what it was called with. */
const recording = () => {
	const calls: Array<{ url: string; headers: Headers }> = [];
	const request = vi.fn(async (input: string | URL, init?: RequestInit) => {
		calls.push({ url: String(input), headers: new Headers(init?.headers) });
		return new Response(JSON.stringify({ valid: true }));
	});
	return { calls, request };
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('the engine fetch', () => {
	test('adds the token to a same-origin request with an unsafe method, relative or absolute', async () => {
		vi.stubGlobal('location', { href: `${own}/signup` });
		const { calls, request } = recording();
		const engine = createFormEngine({ fetch: request, csrf: policy() });
		for (const method of ['POST', 'put', 'PATCH', 'DELETE']) await engine.fetch('/api/save', { method });
		await engine.fetch(`${own}/api/save`, { method: 'POST' });
		await engine.fetch(new URL(`${own}/api/save`), { method: 'POST' });
		expect(calls).toHaveLength(6);
		expect(calls.every(({ headers }) => headers.get(TOKEN_HEADER) === 'secret')).toBe(true);
	});

	test('keeps the headers a caller set, and replaces one of the same name', async () => {
		vi.stubGlobal('location', { href: `${own}/signup` });
		const { calls, request } = recording();
		const engine = createFormEngine({ fetch: request, csrf: policy() });
		await engine.fetch('/api/save', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', [TOKEN_HEADER]: 'old' },
		});
		expect(calls[0].headers.get('Content-Type')).toBe('application/json');
		expect(calls[0].headers.get(TOKEN_HEADER)).toBe('secret');
	});

	test('adds nothing to a safe method, a cross-origin request, a missing token or a page with no location', async () => {
		vi.stubGlobal('location', { href: `${own}/signup` });
		const { calls, request } = recording();
		const engine = createFormEngine({ fetch: request, csrf: policy() });
		await engine.fetch('/api/save');
		await engine.fetch('/api/save', { method: 'GET' });
		await engine.fetch('https://other.example.com/api/save', { method: 'POST' });
		await engine.fetch('//other.example.com/api/save', { method: 'POST' });
		await engine.fetch('http://app.example.com/api/save', { method: 'POST' });
		await createFormEngine({ fetch: request, csrf: policy(() => undefined) }).fetch('/api/save', {
			method: 'POST',
		});
		await createFormEngine({ fetch: request, csrf: policy(() => '') }).fetch('/api/save', { method: 'POST' });
		vi.unstubAllGlobals();
		await engine.fetch(`${own}/api/save`, { method: 'POST' });
		expect(calls).toHaveLength(8);
		expect(calls.some(({ headers }) => headers.has(TOKEN_HEADER))).toBe(false);
	});

	test('resolves a relative URL against the document base, as the browser does, so a <base href> elsewhere gets no token', async () => {
		vi.stubGlobal('location', { href: `${own}/signup` });
		vi.stubGlobal('document', { baseURI: 'https://static.example.com/' });
		const { calls, request } = recording();
		const engine = createFormEngine({ fetch: request, csrf: policy() });
		await engine.fetch('/api/save', { method: 'POST' });
		await engine.fetch(`${own}/api/save`, { method: 'POST' });
		expect(calls.map(({ headers }) => headers.has(TOKEN_HEADER))).toEqual([false, true]);
	});

	test('reads the token at request time, so a rotated token is picked up', async () => {
		vi.stubGlobal('location', { href: `${own}/` });
		const { calls, request } = recording();
		let token = 'first';
		const engine = createFormEngine({
			fetch: request,
			csrf: csrf.custom({ token: () => token, header: TOKEN_HEADER }),
		});
		await engine.fetch('/a', { method: 'POST' });
		token = 'second';
		await engine.fetch('/a', { method: 'POST' });
		expect(calls.map(({ headers }) => headers.get(TOKEN_HEADER))).toEqual(['first', 'second']);
	});

	test('is off unless configured: it is the given fetch, or the global one, and there is no policy', async () => {
		vi.stubGlobal('location', { href: `${own}/` });
		const { calls, request } = recording();
		const engine = createFormEngine({ fetch: request });
		await engine.fetch('/a', { method: 'POST' });
		expect(calls[0].headers.has(TOKEN_HEADER)).toBe(false);
		expect(engine.getCsrf()).toBeUndefined();

		const global = vi.fn(async () => new Response(null));
		vi.stubGlobal('fetch', global);
		await createFormEngine().fetch('/b');
		expect(global).toHaveBeenCalledWith('/b', undefined);
	});

	test('exposes the policy for a binding, and an extended engine inherits the fetch and the policy', async () => {
		vi.stubGlobal('location', { href: `${own}/` });
		const { calls, request } = recording();
		const engine = createFormEngine({ fetch: request, csrf: policy() });
		expect(engine.getCsrf()?.field).toBe('_csrf');
		expect(engine.getCsrf()?.header).toBe(TOKEN_HEADER);
		expect(engine.getCsrf()?.token()).toBe('secret');
		const extended = engine.extend();
		await extended.fetch('/a', { method: 'POST' });
		expect(extended.getCsrf()).toBe(engine.getCsrf());
		expect(calls[0].headers.get(TOKEN_HEADER)).toBe('secret');
	});
});

describe('what carries the token', () => {
	test('an async validation rule request carries it', async () => {
		vi.stubGlobal('location', { href: `${own}/signup` });
		const { calls, request } = recording();
		const engine = createFormEngine({ fetch: request, csrf: policy() });
		const schema = engine
			.getValidationRegistry()
			.createSchema({ type: 'async', url: '/api/check', disableCache: true }, createValidationContext());
		const result = await schema.safeParseAsync('ada');
		expect(result.success).toBe(true);
		expect(calls).toHaveLength(1);
		expect(calls[0].url).toBe('/api/check');
		expect(calls[0].headers.get(TOKEN_HEADER)).toBe('secret');
	});

	test('the action context hands actions the engine fetch, and the submit action uses it', async () => {
		vi.stubGlobal('location', { href: `${own}/signup` });
		const { calls, request } = recording();
		const engine = createFormEngine({ fetch: request, csrf: policy() });
		const context = buildFormActionContext({
			config: { id: 'signup' },
			values: {},
			formState: { isValid: true, errors: {}, touched: {}, submitCount: 0 },
			step: { id: 'main', position: 0, total: 1 },
			mountedAt: 0,
			form: createMockBuilderContext({}).form,
			fetch: engine.fetch,
		});
		await context.fetch('/api/custom', { method: 'POST' });
		expect(calls[0].headers.get(TOKEN_HEADER)).toBe('secret');

		const action: FormSubmitAction = {
			id: 's',
			$type: 'submit',
			enabled: true,
			endpoint: '/api/submit',
			method: 'POST',
		};
		const result = await formSubmitPlugin().execute(createMockBuilderContext(action, { fetch: engine.fetch }));
		expect(result.success).toBe(true);
		expect(calls[1].url).toBe('/api/submit');
		expect(calls[1].headers.get(TOKEN_HEADER)).toBe('secret');
	});
});

describe('csrf readers', () => {
	test('fromMeta reads the content of the named meta tag, and nothing when it is absent or empty', () => {
		const metas = [
			{ name: 'viewport', content: 'width=device-width' },
			{ name: 'csrf-token', content: 'from-meta' },
		];
		vi.stubGlobal('document', { getElementsByTagName: () => metas });
		const reader = csrf.fromMeta('csrf-token', { header: TOKEN_HEADER, field: '_token' });
		expect(reader.token()).toBe('from-meta');
		expect(reader.header).toBe(TOKEN_HEADER);
		expect(reader.field).toBe('_token');
		expect(csrf.fromMeta('missing', { header: TOKEN_HEADER }).token()).toBeUndefined();
		expect(csrf.fromMeta('missing', { header: TOKEN_HEADER })).not.toHaveProperty('field');
		metas[1].content = '';
		expect(reader.token()).toBeUndefined();
	});

	test('fromCookie reads the decoded value of the named cookie', () => {
		const jar = { cookie: 'theme=dark; XSRF-TOKEN=a%2Fb%3D%3D; other=1' };
		vi.stubGlobal('document', jar);
		const reader = csrf.fromCookie('XSRF-TOKEN', { header: 'X-XSRF-TOKEN' });
		expect(reader.token()).toBe('a/b==');
		expect(csrf.fromCookie('XSRF', { header: 'X' }).token()).toBeUndefined();
		jar.cookie = 'XSRF-TOKEN=%E0%A4%A';
		expect(reader.token()).toBeUndefined();
		jar.cookie = '';
		expect(reader.token()).toBeUndefined();
	});

	test('custom reads through the function it is given, and an empty token is none', () => {
		let value: string | undefined = 'x';
		const reader = csrf.custom({ token: () => value, header: 'X-Token' });
		expect(reader.token()).toBe('x');
		value = '';
		expect(reader.token()).toBeUndefined();
	});

	test('are safe on a server: no document or location is touched at import or read, and there is no token', () => {
		expect(typeof document).toBe('undefined');
		expect(csrf.fromMeta('csrf-token', { header: 'X' }).token()).toBeUndefined();
		expect(csrf.fromCookie('XSRF-TOKEN', { header: 'X' }).token()).toBeUndefined();
	});
});

describe('csrfFieldFor', () => {
	const post = { method: 'post', action: '/api/signup' };

	test('returns the field and the current token for a same-origin post, whatever the case of the method', () => {
		vi.stubGlobal('location', { href: `${own}/signup` });
		let token = 'first';
		const reader = csrf.custom({ token: () => token, header: TOKEN_HEADER, field: '_csrf' });
		expect(csrfFieldFor(reader, post)).toEqual({ name: '_csrf', value: 'first' });
		expect(csrfFieldFor(reader, { method: 'POST', action: `${own}/api/signup` })).toEqual({
			name: '_csrf',
			value: 'first',
		});
		expect(csrfFieldFor(reader, { method: 'post', action: '' })).toEqual({ name: '_csrf', value: 'first' });
		token = 'second';
		expect(csrfFieldFor(reader, post)?.value).toBe('second');
	});

	test('returns nothing for a cross-origin action, a get or dialog form, a missing token, a policy with no field or no policy', () => {
		vi.stubGlobal('location', { href: `${own}/signup` });
		expect(csrfFieldFor(policy(), { method: 'post', action: 'https://other.example.com/save' })).toBeUndefined();
		expect(csrfFieldFor(policy(), { method: 'post', action: '//other.example.com/save' })).toBeUndefined();
		expect(csrfFieldFor(policy(), { method: 'get', action: '/search' })).toBeUndefined();
		expect(csrfFieldFor(policy(), { method: 'dialog', action: '' })).toBeUndefined();
		expect(
			csrfFieldFor(
				policy(() => undefined),
				post,
			),
		).toBeUndefined();
		expect(csrfFieldFor(csrf.custom({ token: () => 'secret', header: TOKEN_HEADER }), post)).toBeUndefined();
		expect(csrfFieldFor(undefined, post)).toBeUndefined();
	});

	test('resolves the action against the document base, and returns nothing on a server', () => {
		vi.stubGlobal('location', { href: `${own}/signup` });
		vi.stubGlobal('document', { baseURI: 'https://static.example.com/' });
		expect(csrfFieldFor(policy(), post)).toBeUndefined();
		vi.unstubAllGlobals();
		expect(csrfFieldFor(policy(), post)).toBeUndefined();
	});
});
