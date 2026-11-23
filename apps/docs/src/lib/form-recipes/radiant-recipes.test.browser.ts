import { createRoot } from '@ecopages/jsx/client';
import { FormRenderer } from '@schema-engine/forms-radiant';
import { afterEach, expect, test, vi } from 'vitest';
import { engine as toneEngine, type ToneControl } from './radiant-control';
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
						elements: [{ $type: 'input', id: 'email', name: 'email', rules: [{ type: 'required' }] }],
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
			container?: { fieldArray(path: string): { append(value: unknown): void }; validate(): Promise<boolean> };
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
						rules: [{ type: 'required', message: 'Pick one' }],
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
