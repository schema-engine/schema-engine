import { selectError } from '@schema-engine/forms/state-container';
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { containerOf, mountField } from './mount-field';

afterEach(() => document.body.replaceChildren());

const otp = { $type: 'input-otp', id: 'code', name: 'code', label: 'Verification code', length: 6 } as const;

async function mountOtp() {
	const { host, field } = await mountField(otp);
	const slots = () => Array.from(host.querySelectorAll<HTMLInputElement>('se-input-otp input'));
	const values = () => slots().map((slot) => slot.value);
	return { field, slots, values };
}

test('a character typed into a later slot stays in that slot', async () => {
	const { field, slots, values } = await mountOtp();

	await userEvent.type(slots()[3]!, '5');

	await expect.poll(() => values()).toEqual(['', '', '', '5', '', '']);
	expect(document.activeElement).toBe(slots()[4]);
	expect(containerOf(field).getValue('code')).toBe('5');
});

test('clearing a slot leaves the other slots alone', async () => {
	const { slots, values } = await mountOtp();
	await userEvent.type(slots()[0]!, '123456');
	await expect.poll(() => values()).toEqual(['1', '2', '3', '4', '5', '6']);

	await userEvent.clear(slots()[1]!);

	await expect.poll(() => values()).toEqual(['1', '', '3', '4', '5', '6']);
});

test('slots and their group have accessible names', async () => {
	await mountOtp();

	await expect.element(page.getByRole('textbox', { name: 'Character 2 of 6' })).toBeInTheDocument();
	await expect.element(page.getByRole('group', { name: 'Verification code' })).toBeInTheDocument();
});

test('a paste fills the slots from the first one and drops characters the pattern rejects', async () => {
	const { field, slots, values } = await mountOtp();
	const data = new DataTransfer();
	data.setData('text', '12ab34');

	slots()[2]!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));

	await expect.poll(() => values()).toEqual(['1', '2', '3', '4', '', '']);
	expect(containerOf(field).getValue('code')).toBe('1234');
});

test('Backspace in an empty slot moves focus to the previous slot', async () => {
	const { slots } = await mountOtp();
	await userEvent.type(slots()[0]!, '1');
	expect(document.activeElement).toBe(slots()[1]);

	await userEvent.keyboard('{Backspace}');

	expect(document.activeElement).toBe(slots()[0]);
});

test('an incomplete code is invalid by default and keeps its slots positional', async () => {
	const { field, slots, values } = await mountOtp();
	await userEvent.type(slots()[0]!, '1');
	await userEvent.type(slots()[2]!, '3456');
	await expect.poll(() => values()).toEqual(['1', '', '3', '4', '5', '6']);

	await expect(containerOf(field).validate()).resolves.toBe(false);
	expect(selectError(containerOf(field).getSnapshot(), 'code')?.message).toBe('Enter all 6 characters');
	expect(values()).toEqual(['1', '', '3', '4', '5', '6']);

	await userEvent.type(slots()[1]!, '2');
	await expect(containerOf(field).validate()).resolves.toBe(true);
});

test('an empty optional code is valid and an authored length rule replaces the default', async () => {
	const optional = await mountOtp();
	await expect(containerOf(optional.field).validate()).resolves.toBe(true);
	document.body.replaceChildren();

	const { field } = await mountField({
		...otp,
		rules: [{ type: 'minLength', value: 4, message: 'Four at least' }],
	});
	const inputs = () => Array.from(document.querySelectorAll<HTMLInputElement>('se-input-otp input'));
	await userEvent.type(inputs()[0]!, '12');
	await expect(containerOf(field).validate()).resolves.toBe(false);
	expect(selectError(containerOf(field).getSnapshot(), 'code')?.message).toBe('Four at least');
});

test('an incomplete code shows the configured message once the field blurs', async () => {
	const { host } = await mountField({ ...otp, incompleteMessage: 'Finish the code' });
	const slots = () => Array.from(host.querySelectorAll<HTMLInputElement>('se-input-otp input'));

	await userEvent.type(slots()[0]!, '123');
	slots()[3]!.blur();

	await expect.element(page.getByText('Finish the code')).toBeInTheDocument();
});

test('a typed character fires input, leaving the group fires change once, a paste fires both, and a programmatic write fires nothing', async () => {
	const { field, slots } = await mountOtp();
	const host = slots()[0]!.closest('se-input-otp')!;
	const seen: string[] = [];
	for (const type of ['input', 'change', 'rui-change']) {
		host.addEventListener(type, (event) => {
			if (event.target === host) seen.push(type);
		});
	}

	containerOf(field).setValue('code', '123456');
	await expect
		.poll(() =>
			slots()
				.map((slot) => slot.value)
				.join(''),
		)
		.toBe('123456');
	expect(seen).toEqual([]);

	await userEvent.clear(slots()[0]!);
	seen.length = 0;
	await userEvent.keyboard('7');
	expect(seen).toEqual(['input']);
	slots()[1]!.blur();
	expect(seen).toEqual(['input', 'change']);

	seen.length = 0;
	slots()[0]!.dispatchEvent(
		Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
			clipboardData: { getData: () => '654321' },
		}),
	);
	expect(seen).toEqual(['input', 'change']);
});
