import '@ecopages/radiant/client/install-hydrator';
import '@ecopages/radiant-ui/radiant-ui-core.css';
import '@ecopages/radiant-ui/themes/default';
import '@ecopages/radiant-ui/styles.css';
import '@/styles/appearance.css';
import '@/styles/hosts.css';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot } from '@ecopages/jsx/client';
import type { RuiFormElement } from '@ecopages/radiant-ui/form';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { containerOf } from './mount-field';

afterEach(() => document.body.replaceChildren());

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
/** The options of one element, labelled by it, so the option a user clicks is the one of its control alone in a form of many. */
const stars = (prefix: string) => [
	{ value: 1, label: `${prefix}: one star` },
	{ value: 2, label: `${prefix}: two stars` },
];

async function mount(elements: readonly Record<string, unknown>[], onSubmit = vi.fn()) {
	const config = engine.validateForm({ id: 'review', steps: [{ id: 'main', title: 'Main', elements }] });
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(FormRenderer({ config, engine, onSubmit }));
	await expect.poll(() => host.querySelector('se-field')).toBeTruthy();
	const first = host.querySelector<HTMLElement>('se-field')!;
	await expect.poll(() => containerOf(first)).toBeTruthy();
	return { host, first, container: containerOf(first), onSubmit };
}

const part = (name: string, selector: string) => (host: HTMLElement) =>
	host.querySelector<HTMLElement>(`se-field[name="${name}"] ${selector}`);
const check = (host: HTMLElement, name: string, value: string) =>
	userEvent.click(part(name, `label:has(input[value="${value}"])`)(host)!);
const pick = (host: HTMLElement, name: string, value: string) =>
	userEvent.click(part(name, `[role="option"][data-value="${value}"]`)(host)!);
const selectText = (name: string) => (host: HTMLElement) =>
	part(name, '[data-select-value]')(host)?.textContent?.trim();
const tagTexts = (name: string) => (host: HTMLElement) =>
	Array.from(host.querySelectorAll(`se-field[name="${name}"] [data-tag]`), (tag) => tag.textContent?.trim());
const comboboxText = (name: string) => (host: HTMLElement) =>
	(part(name, '[data-combobox-input]')(host) as HTMLInputElement | null)?.value;
const checkedValues = (name: string) => (host: HTMLElement) =>
	Array.from(
		host.querySelectorAll<HTMLInputElement>(`se-field[name="${name}"] input:checked`),
		(input) => input.value,
	);
const thumbNow = (host: HTMLElement) => part('volume', '[data-thumb="value"]')(host)?.getAttribute('aria-valuenow');

/**
 * One built-in input, the way a user drives its real control, and what the form submits afterwards.
 *
 * @remarks
 * The submission is parsed against the element's declared `value` schema, so a control that writes any other type
 * fails it and `onSubmit` is never called. `held` is set for the controls that show a value (a choice or a slider):
 * a value the form can hold for the field, and what `shows` reads off the control's own surface once it holds it, so
 * a value written from code is judged by what a user sees.
 */
interface Case {
	name: string;
	element: Record<string, unknown>;
	drive: (host: HTMLElement) => Promise<void>;
	submits: Record<string, unknown>;
	/** How many times the drive changes the value, each of which the host announces as one `input` and one `change`. */
	picks?: number;
	held?: { value: unknown; text: unknown };
	shows?: (host: HTMLElement) => unknown;
}

const typeInto = (selector: string, text: string) => (host: HTMLElement) =>
	userEvent.type(host.querySelector<HTMLInputElement>(selector)!, text);

const inputCases: Case[] = [
	{
		name: 'an input',
		element: { $type: 'input', id: 'text', name: 'text', label: 'Text', inputType: 'text' },
		drive: (host) => userEvent.fill(host.querySelector<HTMLInputElement>('input[name="text"]')!, 'hello'),
		submits: { text: 'hello' },
	},
	{
		name: 'a textarea',
		element: { $type: 'textarea', id: 'notes', name: 'notes', label: 'Notes' },
		drive: (host) =>
			userEvent.fill(host.querySelector<HTMLTextAreaElement>('textarea[name="notes"]')!, 'some notes'),
		submits: { notes: 'some notes' },
	},
	{
		name: 'a number',
		element: { $type: 'number', id: 'age', name: 'age', label: 'Age' },
		drive: async (host) => {
			await userEvent.fill(host.querySelector<HTMLInputElement>('se-field[name="age"] input')!, '42');
			await userEvent.tab();
		},
		submits: { age: 42 },
	},
	{
		name: 'a switch',
		element: { $type: 'switch', id: 'on', name: 'on', label: 'On' },
		drive: (host) =>
			userEvent.click(host.querySelector('se-field[name="on"] [role="switch"], se-field[name="on"] label')!),
		submits: { on: true },
	},
	{
		name: 'a checkbox',
		element: { $type: 'checkbox', id: 'agree', name: 'agree', label: 'Agree' },
		drive: (host) =>
			userEvent.click(
				host.querySelector('se-field[name="agree"] [role="checkbox"], se-field[name="agree"] label')!,
			),
		submits: { agree: true },
	},
	{
		name: 'a masked input',
		element: { $type: 'masked-input', id: 'zip', name: 'zip', label: 'Zip', mask: '000-00' },
		drive: async (host) => {
			await expect
				.poll(() => host.querySelector('se-field[name="zip"] se-masked-input[data-ready]'))
				.toBeTruthy();
			await typeInto('se-field[name="zip"] input', '12345')(host);
		},
		submits: { zip: '123-45' },
	},
	{
		name: 'a masked input with a typed value',
		element: { $type: 'masked-input', id: 'amount', name: 'amount', label: 'Amount', mask: '000', unmask: 'typed' },
		drive: async (host) => {
			await expect
				.poll(() => host.querySelector('se-field[name="amount"] se-masked-input[data-ready]'))
				.toBeTruthy();
			await typeInto('se-field[name="amount"] input', '123')(host);
		},
		submits: { amount: '123' },
	},
	{
		name: 'an OTP input',
		element: { $type: 'input-otp', id: 'code', name: 'code', label: 'Code', length: 4 },
		drive: typeInto('se-field[name="code"] input', '1234'),
		submits: { code: '1234' },
	},
	{
		name: 'a phone input',
		element: { $type: 'phone-input', id: 'phone', name: 'phone', label: 'Phone' },
		drive: async (host) => {
			await expect.poll(() => host.querySelector('se-phone-input[data-ready]')).toBeTruthy();
			await typeInto('se-phone-input [data-ref="number"]', '4155550123')(host);
		},
		submits: { phone: '+14155550123' },
	},
	{
		name: 'a drop zone',
		element: { $type: 'drop-zone', id: 'upload', name: 'upload', label: 'Upload' },
		drive: (host) =>
			userEvent.upload(
				host.querySelector<HTMLInputElement>('se-drop-zone input[type="file"]')!,
				new File(['hello'], 'hello.txt', { type: 'text/plain' }),
			),
		submits: { upload: [expect.any(File)] },
	},
];

const choiceCases: Case[] = [
	{
		name: 'a select with number options',
		element: { $type: 'select', id: 'rating', name: 'rating', label: 'Rating', options: stars('rating') },
		drive: async (host) => {
			await userEvent.click(part('rating', '[data-select-trigger]')(host)!);
			await pick(host, 'rating', '2');
		},
		submits: { rating: 2 },
		held: { value: 1, text: 'rating: one star' },
		shows: selectText('rating'),
	},
	{
		name: 'a select with multiple',
		element: { $type: 'select', id: 'tags', name: 'tags', label: 'Tags', multiple: true, options: stars('tags') },
		drive: async (host) => {
			await userEvent.click(part('tags', '[data-select-trigger]')(host)!);
			await pick(host, 'tags', '2');
			await pick(host, 'tags', '1');
		},
		submits: { tags: [2, 1] },
		picks: 2,
		held: { value: [1, 2], text: ['tags: one star', 'tags: two stars'] },
		shows: tagTexts('tags'),
	},
	{
		name: 'a combobox',
		element: { $type: 'combobox', id: 'flavour', name: 'flavour', label: 'Flavour', options: stars('flavour') },
		drive: async (host) => {
			await userEvent.click(part('flavour', '[data-combobox-trigger]')(host)!);
			await pick(host, 'flavour', '2');
		},
		submits: { flavour: 2 },
		held: { value: 1, text: 'flavour: one star' },
		shows: comboboxText('flavour'),
	},
	{
		name: 'a combobox with multiple',
		element: {
			$type: 'combobox',
			id: 'flavours',
			name: 'flavours',
			label: 'Flavours',
			multiple: true,
			options: stars('flavours'),
		},
		drive: async (host) => {
			await userEvent.click(part('flavours', '[data-combobox-trigger]')(host)!);
			await pick(host, 'flavours', '1');
			await pick(host, 'flavours', '2');
		},
		submits: { flavours: [1, 2] },
		picks: 2,
		held: { value: [2], text: ['flavours: two stars'] },
		shows: tagTexts('flavours'),
	},
	{
		name: 'a radio group',
		element: { $type: 'radio', id: 'service', name: 'service', label: 'Service', options: stars('service') },
		drive: (host) => check(host, 'service', '2'),
		submits: { service: 2 },
		held: { value: 1, text: ['1'] },
		shows: checkedValues('service'),
	},
	{
		name: 'a checkbox group',
		element: { $type: 'checkbox-group', id: 'extras', name: 'extras', label: 'Extras', options: stars('extras') },
		drive: async (host) => {
			await check(host, 'extras', '2');
			await check(host, 'extras', '1');
		},
		submits: { extras: [1, 2] },
		picks: 2,
		held: { value: [1, 2], text: ['1', '2'] },
		shows: checkedValues('extras'),
	},
	{
		name: 'a slider',
		element: { $type: 'slider', id: 'volume', name: 'volume', label: 'Volume', min: 0, max: 10, defaultValue: 5 },
		drive: async (host) => {
			part('volume', '[data-thumb="value"]')(host)!.focus();
			await userEvent.keyboard('{ArrowRight}{ArrowRight}');
		},
		submits: { volume: 7 },
		picks: 2,
		held: { value: 9, text: '9' },
		shows: thumbNow,
	},
];

const cases = [...inputCases, ...choiceCases];

describe.each(cases)('$name', ({ element, drive, submits }) => {
	test('submits the value its element declares when a user drives the control', async () => {
		const { host, onSubmit } = await mount([element]);

		await drive(host);
		host.querySelector('form')!.requestSubmit();

		await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
		expect(onSubmit.mock.calls[0]?.[0]).toEqual(submits);
	});
});

describe.each(choiceCases)('$name', ({ element, drive, held, shows, picks = 1 }) => {
	const name = element['name'] as string;

	test('a user change reaches the field as one input and one change from the host, once it holds the value', async () => {
		const { host, first } = await mount([element]);
		const control = part(name, '[data-rui-control]')(host)!.localName;
		const events: string[] = [];
		for (const type of ['input', 'change']) {
			first.addEventListener(type, (event) => events.push(`${type}:${(event.target as Element).localName}`));
		}

		await drive(host);

		const own = events.filter((entry) => entry.endsWith(`:${control}`));
		expect(own).toEqual(Array.from({ length: picks }, () => [`input:${control}`, `change:${control}`]).flat());
	});

	test('a value set from code reaches the control and dispatches nothing', async () => {
		const { host, first, container } = await mount([element]);
		const events = vi.fn();
		first.addEventListener('input', events);
		first.addEventListener('change', events);

		container.setValue(name, held!.value);

		await expect.poll(() => shows!(host)).toEqual(held!.text);
		expect(container.getValue(name)).toEqual(held!.value);
		expect(events).not.toHaveBeenCalled();
	});

	test('a reset writes the form back into the control', async () => {
		const { host, container } = await mount([element]);
		await expect.poll(() => shows!(host) ?? null).not.toBeNull();
		const initial = shows!(host);
		await drive(host);
		await expect.poll(() => shows!(host)).not.toEqual(initial);

		container.reset();

		await expect.poll(() => shows!(host)).toEqual(initial);
	});
});

test('a form of every built-in input submits the declared values together', async () => {
	const { host, onSubmit } = await mount(cases.map((entry) => entry.element));

	for (const entry of cases) await entry.drive(host);
	host.querySelector('form')!.requestSubmit();

	await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
	expect(onSubmit.mock.calls[0]?.[0]).toEqual(Object.assign({}, ...cases.map((entry) => entry.submits)));
});

test('a native fact of a control reaches the container as the control reports it', async () => {
	const { host, container } = await mount([
		{ $type: 'input', id: 'mail', name: 'mail', label: 'Mail', inputType: 'email', defaultValue: 'not-an-email' },
		...cases.map((entry) => entry.element),
	]);
	const reported = vi.spyOn(container, 'reportNative');

	host.querySelector('form')!.requestSubmit();

	await expect.poll(() => reported.mock.calls.some(([facts]) => 'mail' in facts)).toBe(true);
	const facts = reported.mock.calls.map(([call]) => call).find((call) => 'mail' in call)!;
	expect(facts['mail']).toMatchObject({ type: 'typeMismatch' });
	expect(Object.keys(facts)).toEqual(
		expect.arrayContaining(['rating', 'tags', 'flavour', 'flavours', 'service', 'extras', 'volume']),
	);
});

test('a change of the issue formatter connects the same container again and keeps the controls', async () => {
	const { host, container } = await mount(choiceCases.map((entry) => entry.element));
	const connect = vi.spyOn(host.querySelector<RuiFormElement>('rui-form')!, 'connect');
	const controls = () =>
		Array.from(host.querySelectorAll('se-select, se-combobox, se-radio-group, se-checkbox-group, se-slider'));
	const before = controls();

	host.querySelector('se-form-renderer')!.formatIssue = (_issue, { path }) => `renderer:${path}`;

	await expect.poll(() => connect.mock.calls.length).toBe(1);
	expect(connect.mock.calls[0]?.[0]).toBe(container);
	expect(before).toHaveLength(choiceCases.length);
	const after = controls();
	expect(after).toHaveLength(before.length);
	before.forEach((control, index) => expect(after[index]).toBe(control));
});
