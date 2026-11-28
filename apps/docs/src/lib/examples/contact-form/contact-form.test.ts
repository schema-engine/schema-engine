import { afterEach, describe, expect, test, vi } from 'vitest';
import type { FormSubmitHelpers } from '@schema-engine/forms';
import { createFormStateContainer } from '@schema-engine/forms/state-container';
import { contactForm } from './config';
import { engine as reactEngine } from './contact-form.react';
import { engine as radiantEngine } from './contact-form.radiant';
import { sendMessage } from './submit';

afterEach(() => vi.restoreAllMocks());

const values = { name: 'Ada Lovelace', email: 'ada@example.com', subject: 'general', message: 'Hello there, team.' };

function helpers(response: Response) {
	const fetch = vi.fn(async () => response);
	const setServerErrors = vi.fn();
	return { fetch, setServerErrors, helpers: { fetch, setServerErrors } as unknown as FormSubmitHelpers };
}

describe('the contact form config', () => {
	test.each([
		['React', reactEngine],
		['Radiant', radiantEngine],
	])('is a valid form in the %s engine', (_renderer, engine) => {
		expect(engine.safeValidateForm(contactForm)).toMatchObject({ success: true });
	});

	test('a support request must carry a ticket in the documented shape, and another subject does not', async () => {
		const config = reactEngine.validateForm(contactForm);
		const container = createFormStateContainer({ config, registry: reactEngine.validations });

		for (const [name, value] of Object.entries({ ...values, subject: 'support' })) container.setValue(name, value);
		expect((await container.validate()).outcome).toBe('invalid');
		expect(container.getSnapshot().errors['ticket']).toMatchObject({
			type: 'required',
			message: 'Enter your ticket number',
		});

		container.setValue('ticket', 'ticket 1');
		await container.validate();
		expect(container.getSnapshot().errors['ticket']).toMatchObject({
			type: 'pattern',
			message: 'Use a ticket number such as SUP-1024',
		});

		container.setValue('ticket', 'SUP-1024');
		expect((await container.validate()).outcome).toBe('passed');

		container.setValue('subject', 'general');
		container.setValue('ticket', '');
		expect((await container.validate()).outcome).toBe('passed');
	});
});

describe('sendMessage', () => {
	test('posts the values as JSON and says the message was accepted', async () => {
		const { fetch, setServerErrors, helpers: given } = helpers(new Response(null, { status: 201 }));
		await expect(sendMessage(values, given)).resolves.toBe(true);
		expect(fetch).toHaveBeenCalledWith('/api/contact', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(values),
		});
		expect(setServerErrors).not.toHaveBeenCalled();
	});

	test('a 422 with Problem Details is shown on the fields it names and counts as not sent', async () => {
		const problem = {
			type: 'https://example.com/problems/validation',
			title: 'Validation failed',
			status: 422,
			errors: [{ pointer: '#/email', code: 'undeliverable', detail: 'This address cannot receive mail' }],
		};
		const { setServerErrors, helpers: given } = helpers(Response.json(problem, { status: 422 }));
		await expect(sendMessage(values, given)).resolves.toBe(false);
		expect(setServerErrors).toHaveBeenCalledWith({
			email: { type: 'undeliverable', message: 'This address cannot receive mail' },
		});
	});

	test('any other failure throws, so the form reports a failed submission', async () => {
		const { setServerErrors, helpers: given } = helpers(new Response(null, { status: 500 }));
		await expect(sendMessage(values, given)).rejects.toThrow('The server answered 500.');
		expect(setServerErrors).not.toHaveBeenCalled();
	});
});

describe('the notice of the contact form', () => {
	test.each([
		['React', reactEngine],
		['Radiant', radiantEngine],
	])(
		'is a show_notification action that runs after a successful submission, and the %s engine registers it',
		(_renderer, engine) => {
			const result = engine.safeValidateForm(contactForm);
			expect(result.success && result.data.actions).toMatchObject([
				{
					$type: 'show_notification',
					message: 'Message sent. We answer within one working day.',
					variant: 'success',
					triggers: ['form_submit_success'],
				},
			]);
		},
	);
});
