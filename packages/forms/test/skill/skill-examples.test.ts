import { describe, expect, test, vi } from 'vitest';
import { createContactContainer, submitContact } from '../../../../test-utils/skill-examples/forms/container';
import { addressEngine, addressForm } from '../../../../test-utils/skill-examples/forms/custom-rule';
import { formatIssue, localizedEngine } from '../../../../test-utils/skill-examples/forms/format-issue';
import { appEngine, elementTypes, ruleTypes } from '../../../../test-utils/skill-examples/forms/registry';
import { createNotifyRuntime } from '../../../../test-utils/skill-examples/forms/runtime';
import { csrfEngine, onSubmit } from '../../../../test-utils/skill-examples/forms/submission';
import { createFormStateContainer, selectFieldState } from '@schema-engine/forms/state-container';

describe('the contact form of the skill', () => {
	test('a submission with an empty name is invalid, and the formatter words the issue by its rule id', async () => {
		const { container, result } = await submitContact('', 'ada@example.org');

		expect(result).toEqual({ outcome: 'invalid' });
		const issue = container.getSnapshot().errors.name;
		expect(issue).toMatchObject({ type: 'required', ruleId: 'name-required', source: 'validation' });
		expect(formatIssue(issue, { path: 'name' })).toBe('Tell us your name');
	});

	test('a passed submission has the values that took part, and the server answer lands on its field', async () => {
		const { container, result } = await submitContact('Ada', 'ada@example.com');

		expect(result).toMatchObject({ outcome: 'passed', values: { name: 'Ada', email: 'ada@example.com' } });
		expect(result.outcome === 'passed' && 'company' in result.values).toBe(false);
		const issue = container.getSnapshot().errors.email;
		expect(issue).toMatchObject({ type: 'taken', source: 'server' });
		expect(formatIssue(issue, { path: 'email' })).toBe('Already taken');
		expect(selectFieldState(container.getSnapshot(), 'company').hidden).toBe(true);
	});

	test('a warning rule reports advice and never blocks', async () => {
		const container = createContactContainer();
		container.setValue('name', 'Ada');
		container.setValue('email', 'ada@example.org');
		container.setValue('nickname', 'ab');

		expect(await container.validate()).toEqual({ outcome: 'passed' });
		expect(container.getSnapshot().warnings.nickname).toMatchObject({
			type: 'minLength',
			ruleId: 'nickname-short',
		});
	});

	test('a validate outrun by a reset is overtaken, not invalid', async () => {
		const container = createContactContainer();
		const run = container.validate();
		container.reset();

		expect(await run).toEqual({ outcome: 'overtaken' });
	});

	test('the localized engine carries the formatter', () => {
		expect(localizedEngine.getIssueFormatter()).toBe(formatIssue);
	});
});

describe('a custom rule', () => {
	test('is checked by the container and keeps its type and message', async () => {
		const container = createFormStateContainer({
			config: addressForm,
			registry: addressEngine.getValidationRegistry(),
		});

		container.setValue('postalCode', 'abc');
		expect(await container.validate()).toEqual({ outcome: 'invalid' });
		expect(container.getSnapshot().errors.postalCode).toMatchObject({
			type: 'postalCode',
			message: 'Enter a postal code',
		});

		container.setValue('postalCode', '12345-6789');
		expect(await container.validate()).toEqual({ outcome: 'passed' });
	});
});

describe('submission', () => {
	test('onSubmit turns a Problem Details answer into server errors', async () => {
		const setServerErrors = vi.fn();
		const fetch = vi.fn(async () =>
			Response.json({ errors: [{ pointer: '/email', code: 'taken', detail: 'Email taken' }] }, { status: 422 }),
		);

		await onSubmit({ email: 'ada@example.com' }, { fetch, setServerErrors });

		expect(fetch).toHaveBeenCalledWith('/api/contact', expect.objectContaining({ method: 'POST' }));
		expect(setServerErrors).toHaveBeenCalledWith({
			email: expect.objectContaining({ type: 'taken', message: 'Email taken' }),
		});
	});

	test('the CSRF policy puts the token on a same-origin unsafe request of the engine fetch', async () => {
		const sent = vi.fn(async () => new Response('ok'));
		vi.stubGlobal('fetch', sent);
		vi.stubGlobal('location', { href: 'https://example.com/form' });
		vi.stubGlobal('document', {
			baseURI: 'https://example.com/form',
			getElementsByTagName: () => [{ name: 'csrf-token', content: 'secret' }],
		});
		try {
			await csrfEngine.fetch('/api/contact', { method: 'POST' });
		} finally {
			vi.unstubAllGlobals();
		}

		const headers = new Headers((sent.mock.calls[0] as unknown as [string, RequestInit])[1].headers);
		expect(headers.get('x-csrf-token')).toBe('secret');
	});
});

describe('actions and the runtime', () => {
	test('the notify action runs on submit with the form data, through the engine fetch', async () => {
		const sent = vi.fn(async () => new Response('ok'));
		vi.stubGlobal('fetch', sent);
		try {
			const onSubmitted = vi.fn();
			const { runtime, unmount } = createNotifyRuntime(onSubmitted);
			runtime.container.setValue('email', 'ada@example.com');

			expect(await runtime.submit()).toBe('submitted');
			unmount();

			expect(onSubmitted).toHaveBeenCalledWith({ email: 'ada@example.com' }, expect.anything());
			expect(sent).toHaveBeenCalledWith('/api/notify', expect.objectContaining({ method: 'POST' }));
			expect(
				JSON.parse((sent.mock.calls[0] as unknown as [string, RequestInit])[1].body as string),
			).toMatchObject({
				channel: 'ops',
				formData: { email: 'ada@example.com' },
			});
		} finally {
			vi.unstubAllGlobals();
		}
	});
});

describe('registries', () => {
	test('the engine lists the elements it was given and the rules it holds, built-in and registered', () => {
		expect(appEngine.getElement('text')).toMatchObject({ $type: 'text' });
		expect(appEngine.getElement('missing')).toBeUndefined();
		expect(elementTypes).toEqual(['text']);
		expect(ruleTypes).toEqual(expect.arrayContaining(['required', 'postalCode']));
		expect(appEngine.getValidationRegistry().has('postalCode')).toBe(true);
	});
});
