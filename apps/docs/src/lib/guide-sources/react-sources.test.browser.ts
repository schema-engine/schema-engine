import { createElement, Profiler } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FormRenderer } from '@schema-engine/forms-react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { FeedbackForm } from './agent-tool.react';
import { Checkout } from './react-stepper.react';
import { ContactWithStatus } from './react-form-status.react';
import { ContactForm } from './react-quick-start.react';
import { SettingsPanel } from './settings-panel.react';
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

describe('the settings panel', () => {
	test('takes settings in as defaults, reads them through onChange and is not a nested form', async () => {
		const save = vi.fn(async () => {});
		const host = await mount(
			createElement(SettingsPanel, { settings: { digest: true, frequency: 'weekly' }, save }),
		);
		const toggle = host.querySelector<HTMLElement>('[role="switch"]')!;
		const trigger = host.querySelector<HTMLElement>('[data-slot="select-trigger"]')!;
		expect(toggle.getAttribute('aria-checked')).toBe('true');
		expect(host.querySelectorAll('form')).toHaveLength(1);
		expect(host.querySelector('form form')).toBeNull();

		toggle.click();
		await userEvent.click(trigger);
		const options = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
		const chosen = options().find((option) => option.getAttribute('aria-selected') === 'true');
		expect(chosen?.textContent).toBe('Every week');
		await userEvent.click(options().find((option) => option.textContent === 'Every day')!);
		await userEvent.click(
			[...host.querySelectorAll('button')].find((button) => button.textContent === 'Save settings')!,
		);
		await expect.poll(() => save.mock.calls.length).toBe(1);
		expect(save).toHaveBeenCalledWith({ digest: false, frequency: 'daily' });
	});
});

describe('the agent tool', () => {
	type Tool = {
		inputSchema: { properties: Record<string, { description?: string }> };
		execute(input: unknown, options: { signal: AbortSignal }): Promise<{ content: Array<{ text: string }> }>;
	};

	function stubModelContext() {
		const registered: Array<{ tool: Tool; signal: AbortSignal }> = [];
		Object.defineProperty(document, 'modelContext', {
			configurable: true,
			value: {
				registerTool: async (tool: Tool, { signal }: { signal: AbortSignal }) => {
					registered.push({ tool, signal });
				},
			},
		});
		return registered;
	}

	afterEach(() => Reflect.deleteProperty(document, 'modelContext'));

	test('registers the rendered form, fills it through execute and leaves the sending to the user', async () => {
		const registered = stubModelContext();
		const send = vi.fn(async () => {});
		const host = await mount(createElement(FeedbackForm, { send }));
		await expect.poll(() => registered.length).toBe(1);
		const { tool } = registered[0]!;
		expect(tool.inputSchema.properties['stars']!.description).toBe('Rating: From 1 to 5');

		const result = await tool.execute({ name: 'Ada', stars: 4 }, { signal: new AbortController().signal });

		expect(result.content[0]!.text).toContain('waits for the user');
		await expect.poll(() => host.querySelector<HTMLInputElement>('input[name="name"]')!.value).toBe('Ada');
		await expect
			.poll(() => host.querySelectorAll('[role="radiogroup"] button')[3]!.getAttribute('aria-pressed'))
			.toBe('true');
		expect(send).not.toHaveBeenCalled();

		await userEvent.click(host.querySelector('button[type="submit"]')!);
		await expect.poll(() => send.mock.calls.length).toBe(1);
		expect(send).toHaveBeenCalledWith('Ada', 4);
	});

	test('unregisters the tool when the form unmounts', async () => {
		const registered = stubModelContext();
		await mount(createElement(FeedbackForm, { send: async () => {} }));
		await expect.poll(() => registered.length).toBe(1);

		root!.unmount();

		expect(registered[0]!.signal.aborted).toBe(true);
	});
});

describe('the React quick start', () => {
	test('renders with no view recipe, blocks an invalid submit and shows the submitted values', async () => {
		const host = await mount(createElement(ContactForm));
		await userEvent.click(host.querySelector<HTMLButtonElement>('button[type="submit"]')!);
		await expect.poll(() => host.textContent).toContain('Enter your name');
		expect(host.querySelector('pre')).toBeNull();

		await userEvent.type(host.querySelector<HTMLInputElement>('input[name="name"]')!, 'Ada Lovelace');
		await userEvent.type(host.querySelector<HTMLInputElement>('input[name="email"]')!, 'ada@example.com');
		await userEvent.click(host.querySelector<HTMLButtonElement>('button[type="submit"]')!);
		await expect
			.poll(() => host.querySelector('pre')?.textContent)
			.toBe(JSON.stringify({ name: 'Ada Lovelace', email: 'ada@example.com' }));
	});
});

const steps = (host: HTMLElement) =>
	[...host.querySelectorAll<HTMLButtonElement>('ol[aria-label="Steps"] button')].map((button) => ({
		text: button.textContent,
		current: button.getAttribute('aria-current') === 'step',
		disabled: button.disabled,
	}));
const next = (host: HTMLElement) =>
	[...host.querySelectorAll('button')].find((button) => button.textContent === 'Next')!;

describe('the React stepper', () => {
	test('lists the steps that take part, follows the wizard and jumps back to a visited step', async () => {
		const host = await mount(createElement(Checkout, { onSubmit: () => {} }));
		expect(steps(host)).toEqual([
			{ text: 'Contact', current: true, disabled: true },
			{ text: 'Payment', current: false, disabled: true },
		]);

		await userEvent.click(next(host));
		await expect.poll(() => host.querySelector('[role="alert"]')?.textContent).toBe('Enter your email');
		expect(steps(host)[0]).toMatchObject({ text: 'Contact (fix)', current: true });

		await userEvent.type(host.querySelector<HTMLInputElement>('input[name="email"]')!, 'ada@example.com');
		await userEvent.click(next(host));
		await expect.poll(() => host.querySelector('input[name="card"]')).toBeTruthy();
		expect(steps(host)).toEqual([
			{ text: 'Contact', current: false, disabled: false },
			{ text: 'Payment', current: true, disabled: true },
		]);

		await userEvent.click(host.querySelector<HTMLButtonElement>('ol[aria-label="Steps"] button')!);
		await expect.poll(() => host.querySelector('input[name="email"]')).toBeTruthy();
	});

	test('adds the company step when the buyer is a company', async () => {
		const host = await mount(createElement(Checkout, { onSubmit: () => {} }));
		await userEvent.selectOptions(host.querySelector<HTMLSelectElement>('select[name="buyer"]')!, 'company');
		await expect.poll(() => steps(host).map(({ text }) => text)).toEqual(['Contact', 'Company', 'Payment']);
	});
});

describe('the form status', () => {
	test('follows a value and the submission, and starts over', async () => {
		const onSubmit = vi.fn();
		const host = await mount(createElement(ContactWithStatus, { onSubmit }));
		const status = () => host.querySelector('output')?.textContent;
		expect(status()).toBe('Submissions: 0');

		await userEvent.type(host.querySelector<HTMLInputElement>('input[name="email"]')!, 'ada@example.com');
		await expect.poll(status).toBe('Writing to ada@example.com. Submissions: 0');

		await userEvent.type(host.querySelector<HTMLInputElement>('input[name="name"]')!, 'Ada');
		await userEvent.click(host.querySelector('button[type="submit"]')!);
		await expect.poll(status).toBe('Writing to ada@example.com. Submissions: 1');
		expect(onSubmit).toHaveBeenCalledOnce();

		await userEvent.click(
			[...host.querySelectorAll('button')].find((button) => button.textContent === 'Start over')!,
		);
		await expect.poll(status).toBe('Submissions: 0');
		expect(host.querySelector<HTMLInputElement>('input[name="email"]')!.value).toBe('');
	});
});
