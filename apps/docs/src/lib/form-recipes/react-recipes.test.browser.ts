import { createElement, Profiler } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FormRenderer } from '@schema-engine/forms-react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { FeedbackForm } from './agent-tool.react';
import { ProfileEditor } from './react-embed.react';
import { ContactForm } from './react-quick-start.react';
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
	test('renders with no recipe, blocks an invalid submit and shows the submitted values', async () => {
		const host = await mount(createElement(ContactForm));
		await userEvent.click(host.querySelector<HTMLButtonElement>('button[type="submit"]')!);
		await expect.poll(() => host.textContent).toContain('Enter your name');
		expect(host.querySelector('[data-testid="submitted"]')).toBeNull();

		await userEvent.type(host.querySelector<HTMLInputElement>('input[name="name"]')!, 'Ada Lovelace');
		await userEvent.type(host.querySelector<HTMLInputElement>('input[name="email"]')!, 'ada@example.com');
		await userEvent.click(host.querySelector<HTMLButtonElement>('button[type="submit"]')!);
		await expect
			.poll(() => host.querySelector('[data-testid="submitted"]')?.textContent)
			.toBe(JSON.stringify({ name: 'Ada Lovelace', email: 'ada@example.com' }));
	});
});
