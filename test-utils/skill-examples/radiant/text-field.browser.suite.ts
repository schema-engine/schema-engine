import { createRoot } from '@ecopages/jsx/client';
import { afterEach, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { FormRenderer } from '@schema-engine/forms-radiant';
import { containerOf } from './controller';
import { engine } from './engine';

const profile = engine.defineForm({
	id: 'profile',
	steps: [
		{
			id: 'main',
			title: 'Profile',
			elements: [
				{
					$type: 'text',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [{ $type: 'required', message: 'Email is required' }],
				},
				{ $type: 'stars', id: 'stars', name: 'stars', label: 'Stars' },
			],
		},
	],
});

afterEach(() => document.body.replaceChildren());

async function mount() {
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(FormRenderer({ engine, config: profile }));
	await expect.poll(() => host.querySelector('rui-form')).toBeTruthy();
	const ruiForm = host.querySelector<HTMLElement>('rui-form')!;
	await expect.poll(() => containerOf(ruiForm)).toBeTruthy();
	return {
		container: containerOf(ruiForm)!,
		input: host.querySelector<HTMLInputElement>('input[name="email"]')!,
		star: (count: number) => host.querySelector<HTMLElement>(`[aria-label="${count} stars"]`)!,
	};
}

test('typing reaches the form, and reset and setValue in code write back into the control', async () => {
	const { container, input } = await mount();

	await userEvent.fill(input, 'ada@example.com');
	expect(container.getValue('email')).toBe('ada@example.com');

	container.reset();
	await expect.poll(() => input.value).toBe('');
	container.setValue('email', 'code@example.com');
	await expect.poll(() => input.value).toBe('code@example.com');
});

test('the error is shown and announced on the control', async () => {
	const { container, input } = await mount();

	expect(await container.validate()).toEqual({ outcome: 'invalid' });

	await expect.poll(() => input.getAttribute('aria-invalid')).toBe('true');
	const describedBy = input.getAttribute('aria-describedby');
	expect(document.getElementById(describedBy!)).toHaveTextContent('Email is required');
});

test('a native control reports what the browser says about its value', async () => {
	const { container, input } = await mount();

	await userEvent.fill(input, 'not an email');
	await container.validate(['email']);

	expect(container.getSnapshot().errors.email?.all).toContainEqual(
		expect.objectContaining({ type: 'typeMismatch', source: 'native' }),
	);
});

test('a custom host takes its value from the form and gives its changes back', async () => {
	const { container, star } = await mount();

	container.setValue('stars', 3);
	await expect.poll(() => star(3).getAttribute('aria-pressed')).toBe('true');

	await userEvent.click(star(5));
	expect(container.getValue('stars')).toBe(5);
	await expect.poll(() => star(5).getAttribute('aria-pressed')).toBe('true');

	container.reset();
	await expect.poll(() => star(5).getAttribute('aria-pressed')).toBe('false');
});
