import { afterEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { engine } from './engine';
import { renderForm } from './plain-renderer';

afterEach(() => document.body.replaceChildren());

const alerts = () => [...document.querySelectorAll('[role="alert"]')].map((alert) => alert.textContent);

const signup = engine.defineForm({
	id: 'signup',
	steps: [
		{
			id: 'main',
			title: 'Sign up',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Name',
					rules: [{ $type: 'required', message: 'Enter your name' }],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
					rules: [{ $type: 'required', message: 'Enter your email' }],
				},
			],
		},
	],
});

test('an invalid submit shows the issue of each field and focuses the first, and a valid one hands over the values', async () => {
	const onSubmit = vi.fn();
	renderForm(engine, signup, document.body, onSubmit);
	const name = document.querySelector<HTMLInputElement>('[name="name"]')!;
	const email = document.querySelector<HTMLInputElement>('[name="email"]')!;

	await userEvent.click(document.querySelector('button')!);
	await expect.poll(alerts).toEqual(['Enter your name', 'Enter your email']);
	expect(document.activeElement).toBe(name);
	expect(onSubmit).not.toHaveBeenCalled();

	await userEvent.type(name, 'Ada');
	await userEvent.type(email, 'ada@example.com');
	await userEvent.click(document.querySelector('button')!);
	await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
	expect(onSubmit.mock.calls[0]![0]).toEqual({ name: 'Ada', email: 'ada@example.com' });
	expect(alerts()).toEqual(['', '']);
});

test('the cleanup removes the form', () => {
	const stop = renderForm(engine, signup, document.body, () => {});
	expect(document.querySelector('form')).not.toBeNull();
	stop();
	expect(document.querySelector('form')).toBeNull();
});
