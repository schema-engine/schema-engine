import { render, screen } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { describe, expect, test, vi } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';
import { FormRenderer } from '@/components/internals/form-renderer';

const engine = createFormEngine({ elements: schemaFormRegistrations });

const stars = [
	{ value: 1, label: 'One star' },
	{ value: 2, label: 'Two stars' },
];

const now = new Date();
/** The current year and month as the calendar shows them, in local time, which `toISOString` would shift near midnight. */
const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

/** The enabled day of the month a calendar shows, as the button a user clicks. */
const day = (number: string) =>
	Array.from(document.querySelectorAll<HTMLButtonElement>('[role="grid"] button')).find(
		(button) => button.textContent === number && !button.disabled,
	)!;

/**
 * One built-in input, the way a user drives its real control, and what the form submits afterwards.
 *
 * @remarks The submission is parsed against the element's declared `value` schema, so a control that writes any other type fails it and `onSubmit` is never called. `submits` may hold asymmetric matchers.
 */
interface Case {
	name: string;
	element: Record<string, unknown>;
	drive: () => Promise<void>;
	submits: Record<string, unknown>;
}

const cases: Case[] = [
	{
		name: 'input',
		element: { $type: 'input', id: 'text', name: 'text', label: 'Text' },
		drive: () => userEvent.fill(screen.getByRole('textbox', { name: 'Text' }), 'hello'),
		submits: { text: 'hello' },
	},
	{
		name: 'textarea',
		element: { $type: 'textarea', id: 'notes', name: 'notes', label: 'Notes' },
		drive: () => userEvent.fill(screen.getByRole('textbox', { name: 'Notes' }), 'some notes'),
		submits: { notes: 'some notes' },
	},
	{
		name: 'number',
		element: { $type: 'number', id: 'age', name: 'age', label: 'Age' },
		drive: () => userEvent.fill(screen.getByRole('textbox', { name: 'Age' }), '42'),
		submits: { age: 42 },
	},
	{
		name: 'switch',
		element: { $type: 'switch', id: 'on', name: 'on', label: 'On' },
		drive: () => userEvent.click(screen.getByRole('switch', { name: 'On' })),
		submits: { on: true },
	},
	{
		name: 'checkbox',
		element: { $type: 'checkbox', id: 'agree', name: 'agree', label: 'Agree' },
		drive: () => userEvent.click(screen.getByRole('checkbox', { name: 'Agree' })),
		submits: { agree: true },
	},
	{
		name: 'masked-input',
		element: { $type: 'masked-input', id: 'zip', name: 'zip', label: 'Zip', mask: '000-00' },
		drive: () => userEvent.type(screen.getByRole('textbox', { name: 'Zip' }), '12345'),
		submits: { zip: '123-45' },
	},
	{
		name: 'masked-input with a typed value',
		element: { $type: 'masked-input', id: 'amount', name: 'amount', label: 'Amount', mask: '000', unmask: 'typed' },
		drive: () => userEvent.type(screen.getByRole('textbox', { name: 'Amount' }), '123'),
		submits: { amount: '123' },
	},
	{
		name: 'input-otp',
		element: { $type: 'input-otp', id: 'code', name: 'code', label: 'Code', length: 4 },
		drive: () => userEvent.type(screen.getByRole('textbox', { name: 'Code' }), '1234'),
		submits: { code: '1234' },
	},
	{
		name: 'phone-input',
		element: { $type: 'phone-input', id: 'phone', name: 'phone', label: 'Phone', defaultCountry: 'US' },
		drive: () => userEvent.type(screen.getByRole('textbox', { name: /Phone/ }), '4155550123'),
		submits: { phone: '+14155550123' },
	},
	{
		name: 'date',
		element: { $type: 'date', id: 'start', name: 'start', label: 'Start' },
		drive: async () => {
			await userEvent.click(screen.getByRole('button', { name: 'Start' }));
			await userEvent.click(day('15'));
		},
		submits: { start: `${month}-15` },
	},
	{
		name: 'date-range',
		element: { $type: 'date-range', id: 'trip', name: 'trip', label: 'Trip' },
		drive: async () => {
			await userEvent.click(screen.getByRole('button', { name: 'Trip' }));
			await userEvent.click(day('10'));
			await userEvent.click(day('12'));
			await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
		},
		submits: { trip: { from: `${month}-10`, to: `${month}-12` } },
	},
	{
		name: 'drop-zone',
		element: { $type: 'drop-zone', id: 'upload', name: 'upload', label: 'Upload' },
		drive: () =>
			userEvent.upload(
				document.querySelector<HTMLInputElement>('input[type="file"]')!,
				new File(['hello'], 'hello.txt', { type: 'text/plain' }),
			),
		submits: { upload: [expect.objectContaining({ name: 'hello.txt' })] },
	},
	{
		name: 'select',
		element: { $type: 'select', id: 'rating', name: 'rating', label: 'Rating', options: stars },
		drive: () => userEvent.click(screen.getByRole('option', { name: 'Two stars' })),
		submits: { rating: 2 },
	},
	{
		name: 'select with multiple',
		element: { $type: 'select', id: 'tags', name: 'tags', label: 'Tags', multiple: true, options: stars },
		drive: async () => {
			await userEvent.click(screen.getByRole('option', { name: 'Two stars' }));
			await userEvent.click(screen.getByRole('option', { name: 'One star' }));
		},
		submits: { tags: [2, 1] },
	},
	{
		name: 'combobox',
		element: { $type: 'combobox', id: 'flavour', name: 'flavour', label: 'Flavour', options: stars },
		drive: async () => {
			await userEvent.click(screen.getByRole('combobox', { name: 'Flavour' }));
			await userEvent.click(await screen.findByRole('option', { name: 'Two stars' }));
		},
		submits: { flavour: 2 },
	},
	{
		name: 'combobox with multiple',
		element: {
			$type: 'combobox',
			id: 'flavours',
			name: 'flavours',
			label: 'Flavours',
			multiple: true,
			options: stars,
		},
		drive: async () => {
			await userEvent.click(screen.getByRole('combobox', { name: 'Flavours' }));
			await userEvent.click(await screen.findByRole('option', { name: 'One star' }));
			await userEvent.click(await screen.findByRole('option', { name: 'Two stars' }));
			await userEvent.keyboard('{Escape}');
		},
		submits: { flavours: [1, 2] },
	},
	{
		name: 'radio',
		element: { $type: 'radio', id: 'service', name: 'service', label: 'Service', options: stars },
		drive: () => userEvent.click(screen.getByRole('radio', { name: 'Two stars' })),
		submits: { service: 2 },
	},
	{
		name: 'checkbox-group',
		element: { $type: 'checkbox-group', id: 'extras', name: 'extras', label: 'Extras', options: stars },
		drive: async () => {
			await userEvent.click(screen.getByRole('checkbox', { name: 'Two stars' }));
			await userEvent.click(screen.getByRole('checkbox', { name: 'One star' }));
		},
		submits: { extras: [2, 1] },
	},
	{
		name: 'slider',
		element: { $type: 'slider', id: 'volume', name: 'volume', label: 'Volume', min: 0, max: 10, defaultValue: 5 },
		drive: async () => {
			screen.getByRole('slider').focus();
			await userEvent.keyboard('{ArrowRight}{ArrowRight}');
		},
		submits: { volume: 7 },
	},
];

describe.each(cases)('$name', ({ element, drive, submits }) => {
	test('drives its control, submits, and holds the type its declaration says', async () => {
		const onSubmit = vi.fn();
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const config = engine.validateForm({
			id: 'values',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [element, { $type: 'submit', id: 'send', name: 'send', label: 'Send' }],
				},
			],
		});
		render(<FormRenderer engine={engine} config={config} onSubmit={onSubmit} />);

		await drive();
		await userEvent.click(screen.getByRole('button', { name: 'Send' }));

		await expect.poll(() => onSubmit.mock.calls.length + error.mock.calls.length).toBeGreaterThan(0);
		expect(error.mock.calls).toEqual([]);
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0]?.[0]).toEqual(submits);
	});
});
