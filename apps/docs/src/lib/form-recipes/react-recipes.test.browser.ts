import { createElement, Profiler } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FormRenderer } from '@schema-engine/forms-react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { ProfileEditor } from './react-embed.react';
import { engine } from './react-widgets.react';

let root: Root | undefined;
afterEach(() => {
	root?.unmount();
	document.body.replaceChildren();
});

async function mount(element: ReturnType<typeof createElement>) {
	const host = document.createElement('div');
	document.body.append(host);
	root = createRoot(host);
	root.render(element);
	await expect.poll(() => host.querySelector('form')).toBeTruthy();
	return host;
}

const form = engine.defineForm({
	id: 'widgets',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{
					$type: 'text',
					id: 'name',
					name: 'name',
					label: 'Name',
					rules: [{ $type: 'required', message: 'Required' }],
				},
				{ $type: 'rating', id: 'stars', name: 'stars', label: 'Rating' },
				{ $type: 'submit', id: 'save', name: 'save', label: 'Save' },
			],
		},
	],
});

describe('the widgets', () => {
	test('an uncontrolled field renders nothing for a keystroke once it is dirty; a controlled one renders with its value', async () => {
		const commits = vi.fn();
		const onSubmit = vi.fn();
		const host = await mount(
			createElement(
				Profiler,
				{ id: 'form', onRender: commits },
				createElement(FormRenderer, { engine, config: form, onSubmit }),
			),
		);
		const name = host.querySelector<HTMLInputElement>('input[name="name"]')!;
		const mounted = commits.mock.calls.length;
		await userEvent.type(name, 'A');
		await expect.poll(() => commits.mock.calls.length).toBeGreaterThan(mounted);
		const settled = commits.mock.calls.length;

		await userEvent.type(name, 'da');
		expect(name.value).toBe('Ada');
		expect(commits.mock.calls.length).toBe(settled);

		const third = host.querySelectorAll<HTMLButtonElement>('[role="radiogroup"] button')[2]!;
		await userEvent.click(third);
		await expect.poll(() => third.getAttribute('aria-pressed')).toBe('true');
		expect(commits.mock.calls.length).toBeGreaterThan(settled);

		await userEvent.click(host.querySelector('button[type="submit"]')!);
		await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
		expect(onSubmit.mock.calls[0]![0]).toMatchObject({ name: 'Ada', stars: 3 });
	});

	test('an invalid submit shows the rule message under the field and calls nothing', async () => {
		const onSubmit = vi.fn();
		const host = await mount(createElement(FormRenderer, { engine, config: form, onSubmit }));
		await userEvent.click(host.querySelector('button[type="submit"]')!);
		await expect.poll(() => host.querySelector('[role="alert"]')?.textContent).toBe('Required');
		expect(host.querySelector('input[name="name"]')!.getAttribute('aria-invalid')).toBe('true');
		expect(onSubmit).not.toHaveBeenCalled();
	});
});

describe('the embedded form', () => {
	test('takes values in as defaults and hands them out on change and submit', async () => {
		const save = vi.fn(async () => {});
		const host = await mount(createElement(ProfileEditor, { profile: { name: 'Ada', stars: 4 }, save }));
		const name = host.querySelector<HTMLInputElement>('input[name="name"]')!;
		expect(name.value).toBe('Ada');
		expect(host.querySelector('h2')!.textContent).toBe('Ada');

		await userEvent.clear(name);
		await userEvent.type(name, 'Grace');
		await expect.poll(() => host.querySelector('h2')!.textContent).toBe('Grace');

		await userEvent.click(host.querySelector('button[type="submit"]')!);
		await expect.poll(() => save.mock.calls.length).toBe(1);
		expect(save).toHaveBeenCalledWith({ name: 'Grace', stars: 4 });
	});
});
