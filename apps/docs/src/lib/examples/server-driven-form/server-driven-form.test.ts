import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { FormSubmitHelpers } from '@schema-engine/forms';
import { loadForm } from './load-form';
import { GET, POST, signupForm } from './server';
import { engine as radiantEngine } from './server-driven-form.radiant';
import { engine as reactEngine } from './server-driven-form.react';
import { signUp } from './submit';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

const server: typeof fetch = async (url, init) => GET(new Request(url, init));
const origin = 'https://app.example';

beforeEach(() => void vi.stubGlobal('fetch', vi.fn(server)));

describe.each([
	['React', reactEngine],
	['Radiant', radiantEngine],
])('loadForm in the %s engine', (_renderer, engine) => {
	test('returns the config the server sent, checked and normalized', async () => {
		const loaded = await loadForm(engine, `${origin}/forms/signup`);
		expect(loaded.success && loaded.config.steps[0]?.elements.map((element) => element.$type)).toEqual([
			'input',
			'input',
			'select',
			'submit',
		]);
	});

	test('a config this client cannot render is a list of issues with their paths, not an error', async () => {
		const loaded = await loadForm(engine, `${origin}/forms/signup?next`);
		expect(loaded.success).toBe(false);
		expect(!loaded.success && loaded.issues).toHaveLength(1);
		expect(!loaded.success && loaded.issues[0]).toBe(
			"steps[0].elements[4].$type: Unknown element type 'rating'. Register it with createFormEngine({ elements: [...] }).",
		);
	});

	test('an error status is an issue, and a network failure or a body that is not JSON throws', async () => {
		vi.stubGlobal('fetch', async () => new Response('', { status: 404 }));
		expect(await loadForm(engine, '/x')).toEqual({ success: false, issues: ['The server answered 404.'] });
		vi.stubGlobal('fetch', async () => {
			throw new TypeError('Failed to fetch');
		});
		await expect(loadForm(engine, '/x')).rejects.toThrow('Failed to fetch');
		vi.stubGlobal('fetch', async () => new Response('<html>'));
		await expect(loadForm(engine, '/x')).rejects.toThrow(SyntaxError);
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

describe('the notice of the signup form the server sends', () => {
	test.each([
		['React', reactEngine],
		['Radiant', radiantEngine],
	])(
		'is a show_notification action that runs after a successful submission, and the %s engine registers it',
		(_renderer, engine) => {
			const result = engine.safeValidateForm(signupForm);
			expect(result.success && result.data.actions).toMatchObject([
				{
					$type: 'show_notification',
					message: 'Account created.',
					variant: 'success',
					triggers: ['form_submit_success'],
				},
			]);
		},
	);
});
