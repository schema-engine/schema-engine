import { createFormEngine } from '@schema-engine/forms';
import { csrfFieldFor } from '@schema-engine/forms/csrf';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fromCookie, fromGlobal, fromMeta } from './csrf';
import { textInput } from './engine';

const sent = vi.fn(async (_input: string | URL, _init?: RequestInit) => new Response('ok'));

const engineWith = (csrf: typeof fromMeta) => createFormEngine({ elements: [textInput], csrf, fetch: sent });
const headerOf = (call: number, name: string) => new Headers(sent.mock.calls[call]![1]?.headers).get(name);

beforeEach(() => {
	sent.mockClear();
	document.head.insertAdjacentHTML('beforeend', '<meta name="csrf-token" content="meta-token">');
});

afterEach(() => {
	document.head.querySelector('meta[name="csrf-token"]')?.remove();
	document.cookie = 'csrftoken=; Max-Age=0';
	delete (globalThis as { csrfToken?: string }).csrfToken;
});

describe('the policies', () => {
	test('the meta reader sends its header on a same-origin unsafe request only', async () => {
		const engine = engineWith(fromMeta);
		await engine.fetch('/api/signup', { method: 'POST' });
		await engine.fetch('/api/signup');
		await engine.fetch('https://other.example/api/signup', { method: 'POST' });
		expect(headerOf(0, 'X-CSRF-Token')).toBe('meta-token');
		expect(headerOf(1, 'X-CSRF-Token')).toBeNull();
		expect(headerOf(2, 'X-CSRF-Token')).toBeNull();
	});

	test('the cookie reader reads the decoded cookie at request time', async () => {
		const engine = engineWith(fromCookie);
		document.cookie = 'csrftoken=first%20token';
		await engine.fetch('/api', { method: 'DELETE' });
		document.cookie = 'csrftoken=second';
		await engine.fetch('/api', { method: 'DELETE' });
		expect(headerOf(0, 'X-CSRFToken')).toBe('first token');
		expect(headerOf(1, 'X-CSRFToken')).toBe('second');
	});

	test('the custom reader sends nothing while there is no token', async () => {
		const engine = engineWith(fromGlobal);
		await engine.fetch('/api', { method: 'PUT' });
		(globalThis as { csrfToken?: string }).csrfToken = 'global-token';
		await engine.fetch('/api', { method: 'PUT' });
		expect(headerOf(0, 'X-CSRF-Token')).toBeNull();
		expect(headerOf(1, 'X-CSRF-Token')).toBe('global-token');
	});

	test('a native post gets the hidden input only for a same-origin post and a policy with a field', () => {
		const policy = engineWith(fromMeta).getCsrf();
		expect(csrfFieldFor(policy, { method: 'POST', action: '/signup' })).toEqual({
			name: 'authenticity_token',
			value: 'meta-token',
		});
		expect(csrfFieldFor(policy, { method: 'get', action: '/search' })).toBeUndefined();
		expect(csrfFieldFor(policy, { method: 'post', action: 'https://other.example/signup' })).toBeUndefined();
		expect(csrfFieldFor(engineWith(fromGlobal).getCsrf(), { method: 'post', action: '/signup' })).toBeUndefined();
	});
});
