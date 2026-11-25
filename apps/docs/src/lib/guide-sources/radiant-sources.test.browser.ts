import { createRoot } from '@ecopages/jsx/client';
import { FormController, FormRenderer } from '@schema-engine/forms-radiant';
import { afterEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { engine as feedbackEngine, feedback } from './radiant-agent-tool';
import { engine as toneEngine, type ToneControl } from './radiant-control';
import { ContactForm } from './radiant-quick-start';
import { Checkout } from './radiant-stepper';
import { engine } from './radiant-summary';

afterEach(() => document.body.replaceChildren());

test('an element inside the form follows the container of its form', async () => {
	const config = engine.validateForm({
		id: 'contacts',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'arrayElements',
						id: 'contacts',
						name: 'contacts',
						minItems: 1,
						initialValues: { email: '' },
						elements: [{ $type: 'input', id: 'email', name: 'email', rules: [{ $type: 'required' }] }],
					},
					{ $type: 'summary', id: 'summary' },
				],
			},
		],
	});
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(FormRenderer({ config, engine }));

	const summary = () => host.querySelector('contact-summary')?.textContent;
	await expect.poll(summary).toBe('1 contacts, first invalid: false');

	const form = host.querySelector('contact-summary') as HTMLElement & {
		form: {
			container?: {
				fieldArray(path: string): { append(value: unknown): void };
				validate(): Promise<{ outcome: string }>;
			};
		};
	};
	form.form.container!.fieldArray('contacts').append({ email: '' });
	await expect.poll(summary).toBe('2 contacts, first invalid: false');

	await form.form.container!.validate();
	await expect.poll(summary).toBe('2 contacts, first invalid: true');
});

test("a custom control reports its changes with native events and takes the form's values back", async () => {
	const config = toneEngine.validateForm({
		id: 'tone',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'tone',
						id: 'tone',
						name: 'tone',
						label: 'Tone',
						rules: [{ $type: 'required', message: 'Pick one' }],
					},
					{ $type: 'submit', id: 'send', name: 'send', label: 'Send' },
				],
			},
		],
	});
	const onSubmit = vi.fn();
	const onChange = vi.fn();
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(
		FormRenderer({ config, engine: toneEngine, onSubmit, onChange, defaultValues: { tone: 'calm' } }),
	);

	await expect.poll(() => host.querySelector<ToneControl>('x-tone')?.value).toBe('calm');
	const control = host.querySelector<ToneControl>('x-tone')!;
	expect(onChange).not.toHaveBeenCalled();

	control.choose('bold');
	await expect.poll(() => onChange.mock.calls.at(-1)?.[0]).toEqual({ tone: 'bold' });

	const late = document.createElement('x-tone') as ToneControl;
	control.replaceWith(late);
	await expect.poll(() => late.value).toBe('bold');
	late.choose('calm');
	await expect.poll(() => onChange.mock.calls.at(-1)?.[0]).toEqual({ tone: 'calm' });

	late.choose('');
	host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
	await expect.poll(() => host.querySelector('[data-rui-field-error]')?.textContent).toContain('Pick one');
	expect(onSubmit).not.toHaveBeenCalled();

	late.choose('bold');
	host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
	await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
	expect(onSubmit.mock.calls[0]![0]).toEqual({ tone: 'bold' });
});

test('an agent tool registers the rendered form and fills it through execute, leaving the sending to the user', async () => {
	type Tool = {
		inputSchema: { properties: Record<string, { description?: string }> };
		execute(input: unknown, options: { signal: AbortSignal }): Promise<{ content: Array<{ text: string }> }>;
	};
	const registered: Array<{ tool: Tool; signal: AbortSignal }> = [];
	Object.defineProperty(document, 'modelContext', {
		configurable: true,
		value: {
			registerTool: async (tool: Tool, { signal }: { signal: AbortSignal }) => {
				registered.push({ tool, signal });
			},
		},
	});

	try {
		const onSubmit = vi.fn();
		const host = document.createElement('div');
		document.body.append(host);
		createRoot(host).render(FormRenderer({ config: feedback, engine: feedbackEngine, onSubmit }));

		await expect.poll(() => registered.length).toBe(1);
		const { tool, signal } = registered[0]!;
		expect(tool.inputSchema.properties['comment']!.description).toBe('Comment: What went well or badly');

		const result = await tool.execute({ name: 'Ada', comment: 'Fast' }, { signal: new AbortController().signal });

		expect(result.content[0]!.text).toContain('waits for the user');
		await expect.poll(() => host.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe('Ada');
		expect(host.querySelector<HTMLInputElement>('input[name="comment"]')!.value).toBe('Fast');
		expect(onSubmit).not.toHaveBeenCalled();

		host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
		await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
		expect(onSubmit.mock.calls[0]![0]).toEqual({ name: 'Ada', comment: 'Fast' });

		host.remove();
		expect(signal.aborted).toBe(true);
	} finally {
		Reflect.deleteProperty(document, 'modelContext');
	}
});

test('the quick start renders its form in Radiant, blocks an invalid submit and hands out the values', async () => {
	const onSubmit = vi.fn();
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(ContactForm({ onSubmit }));
	await expect.poll(() => host.querySelector('input[name="name"]')).toBeTruthy();

	await userEvent.click(host.querySelector('button[type="submit"]')!);
	await expect.poll(() => host.textContent).toContain('Enter your name');
	expect(onSubmit).not.toHaveBeenCalled();

	await userEvent.type(host.querySelector('input[name="name"]')!, 'Ada Lovelace');
	await userEvent.type(host.querySelector('input[name="email"]')!, 'ada@example.com');
	await userEvent.click(host.querySelector('button[type="submit"]')!);
	await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
	expect(onSubmit.mock.calls[0]![0]).toEqual({ name: 'Ada Lovelace', email: 'ada@example.com' });
});

test('a custom stepper reads the wizard from the form instance and moves it', async () => {
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(Checkout({ onSubmit: () => {} }));
	const steps = () =>
		[...host.querySelectorAll<HTMLButtonElement>('checkout-stepper button')].map((button) => ({
			text: button.textContent,
			current: button.getAttribute('aria-current') === 'step',
			disabled: button.disabled,
		}));
	await expect.poll(steps).toEqual([
		{ text: 'Contact', current: true, disabled: true },
		{ text: 'Payment', current: false, disabled: true },
	]);

	await userEvent.click(
		[...host.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Next')!,
	);
	await expect.poll(() => steps()[0]?.text).toBe('Contact (fix)');

	await userEvent.type(host.querySelector('input[name="email"]')!, 'ada@example.com');
	await userEvent.click(
		[...host.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Next')!,
	);
	await expect.poll(steps).toEqual([
		{ text: 'Contact', current: false, disabled: false },
		{ text: 'Payment', current: true, disabled: true },
	]);

	await userEvent.click(host.querySelector<HTMLButtonElement>('checkout-stepper button')!);
	await expect.poll(() => steps()[0]?.current).toBe(true);

	const form = new FormController(host.querySelector<HTMLElement>('checkout-stepper')!);
	form.container!.setValue('buyer', 'company');
	await expect.poll(() => steps().map(({ text }) => text)).toEqual(['Contact', 'Company', 'Payment']);
});
