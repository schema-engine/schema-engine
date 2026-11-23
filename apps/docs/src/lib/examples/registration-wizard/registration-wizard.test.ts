import { describe, expect, test, vi } from 'vitest';
import type { FormSubmitHelpers } from '@schema-engine/forms';
import { createFormStateContainer } from '@schema-engine/forms/state-container';
import { registration } from './config';
import { engine as reactEngine } from './registration-wizard.react';
import { engine as radiantEngine } from './registration-wizard.radiant';
import { register } from './submit';

const values = { email: 'ada@example.com', password: 'correct horse battery', name: 'Ada Lovelace', role: 'developer' };

function helpers(response: Response) {
	const fetch = vi.fn(async () => response);
	const setServerErrors = vi.fn();
	return { fetch, setServerErrors, helpers: { fetch, setServerErrors } as unknown as FormSubmitHelpers };
}

describe('the registration config', () => {
	test.each([
		['React', reactEngine],
		['Radiant', radiantEngine],
	])('is a valid two-step form in the %s engine', (_renderer, engine) => {
		const result = engine.safeValidateForm(registration);
		expect(result.success && result.data.steps.map((step) => step.id)).toEqual(['account', 'profile']);
		expect(result.success && result.data.view?.$type).toBe('wizard');
	});

	test('the password rule reports its message, and a valid account passes', async () => {
		const config = reactEngine.validateForm(registration);
		const container = createFormStateContainer({ config, registry: reactEngine.getValidationRegistry() });

		container.setValue('email', 'ada@example.com');
		container.setValue('password', 'short');
		await container.validate();
		expect(container.getSnapshot().errors['password']).toMatchObject({
			type: 'minLength',
			message: 'Use at least 12 characters',
		});

		for (const [name, value] of Object.entries(values)) container.setValue(name, value);
		expect((await container.validate()).outcome).toBe('passed');
	});
});

describe('register', () => {
	test('posts the values and says the account was created', async () => {
		const { fetch, setServerErrors, helpers: given } = helpers(new Response(null, { status: 201 }));
		await expect(register(values, given)).resolves.toBe(true);
		expect(fetch).toHaveBeenCalledWith('/api/accounts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(values),
		});
		expect(setServerErrors).not.toHaveBeenCalled();
	});

	test('a 409 shows the taken email on its field and counts as not created', async () => {
		const { setServerErrors, helpers: given } = helpers(new Response(null, { status: 409 }));
		await expect(register(values, given)).resolves.toBe(false);
		expect(setServerErrors).toHaveBeenCalledWith({
			email: { type: 'taken', message: 'An account with this email already exists' },
		});
	});

	test('any other failure throws', async () => {
		const { helpers: given } = helpers(new Response(null, { status: 503 }));
		await expect(register(values, given)).rejects.toThrow('The server answered 503.');
	});
});
