import { afterEach, describe, expect, test, vi } from 'vitest';
import type { FormSubmitHelpers } from '@schema-engine/forms';
import { loadForm } from './load-form';
import { GET, POST } from './server';
import { engine as radiantEngine } from './server-driven-form.radiant';
import { engine as reactEngine } from './server-driven-form.react';
import { signUp } from './submit';

afterEach(() => vi.restoreAllMocks());

const server: typeof fetch = async (url, init) => GET(new Request(url, init));
const answer = (response: () => Response) => async () => response();
const origin = 'https://app.example';

describe.each([
	['React', reactEngine],
	['Radiant', radiantEngine],
])('loadForm in the %s engine', (_renderer, engine) => {
	test('returns the config the server sent, checked and normalized', async () => {
		const loaded = await loadForm(engine, `${origin}/forms/signup`, server);
		expect(loaded.success && loaded.config.steps[0]?.elements.map((element) => element.$type)).toEqual([
			'input',
			'input',
			'select',
			'submit',
		]);
	});

	test('a config this client cannot render is a list of issues with their paths, not an error', async () => {
		const loaded = await loadForm(engine, `${origin}/forms/signup?next`, server);
		expect(loaded.success).toBe(false);
		expect(!loaded.success && loaded.issues).toHaveLength(1);
		expect(!loaded.success && loaded.issues[0]).toBe(
			"steps.0.elements.4.$type: Unknown element type 'rating'. Register it with createFormEngine({ elements: [...] }).",
		);
	});

	test('a network failure, an error status and a body that is not JSON are issues', async () => {
		expect(
			await loadForm(engine, '/x', async () => {
				throw new TypeError('Failed to fetch');
			}),
		).toEqual({ success: false, issues: ['The server could not be reached.'] });
		expect(
			await loadForm(
				engine,
				'/x',
				answer(() => new Response('', { status: 404 })),
			),
		).toEqual({
			success: false,
			issues: ['The server answered 404.'],
		});
		expect(
			await loadForm(
				engine,
				'/x',
				answer(() => new Response('<html>')),
			),
		).toEqual({
			success: false,
			issues: ['The answer is not JSON.'],
		});
	});
});

describe('the server', () => {
	test('answers 422 with Problem Details for a taken username, and 201 otherwise', async () => {
		const taken = await POST(new Request(`${origin}/api/signups`, { method: 'POST', body: '{"username":"ada"}' }));
		expect(taken.status).toBe(422);
		expect(await taken.json()).toMatchObject({ errors: [{ pointer: '#/username', code: 'taken' }] });
		const created = await POST(
			new Request(`${origin}/api/signups`, { method: 'POST', body: '{"username":"grace"}' }),
		);
		expect(created.status).toBe(201);
	});
});

describe('signUp', () => {
	function helpers(response: Response) {
		const fetch = vi.fn(async () => response);
		const setServerErrors = vi.fn();
		return { fetch, setServerErrors, given: { fetch, setServerErrors } as unknown as FormSubmitHelpers };
	}

	test('posts the values and says the account was created', async () => {
		const { fetch, given } = helpers(new Response(null, { status: 201 }));
		await expect(signUp({ username: 'grace' }, given)).resolves.toBe(true);
		expect(fetch).toHaveBeenCalledWith('/api/signups', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{"username":"grace"}',
		});
	});

	test('a 422 is shown on the field it names', async () => {
		const response = await POST(
			new Request(`${origin}/api/signups`, { method: 'POST', body: '{"username":"ada"}' }),
		);
		const { setServerErrors, given } = helpers(response);
		await expect(signUp({ username: 'ada' }, given)).resolves.toBe(false);
		expect(setServerErrors).toHaveBeenCalledWith({
			username: { type: 'taken', message: 'That username is already taken' },
		});
	});

	test('any other failure throws', async () => {
		const { given } = helpers(new Response(null, { status: 503 }));
		await expect(signUp({}, given)).rejects.toThrow('The server answered 503.');
	});
});
