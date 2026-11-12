import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { FormFieldElement } from '@/elements/form-field';
import { formOf, mountField as mount } from './mount-field';

afterEach(() => document.body.replaceChildren());

const masked = { $type: 'masked-input', id: 'zip', name: 'zip', label: 'Zip code', mask: '000-00' } as const;
const phone = { $type: 'phone-input', id: 'contact', name: 'contact', label: 'Contact' } as const;
const otp = { $type: 'input-otp', id: 'code', name: 'code', label: 'Verification code', length: 6 } as const;

test('a required masked input carries its label and ARIA on the visible input', async () => {
	const { host } = await mount({ ...masked, label: 'Mobile', rules: [{ type: 'required', message: 'Required' }] });
	await userEvent.click(host.querySelector('se-masked-input input')!);
	await userEvent.tab();

	const input = page.getByRole('textbox', { name: /^Mobile/ });
	await expect.element(input).toBeInTheDocument();
	const element = host.querySelector<HTMLInputElement>('se-masked-input input')!;
	await expect.poll(() => element.getAttribute('aria-invalid')).toBe('true');
	const describedBy = element.getAttribute('aria-describedby')!;
	expect(document.getElementById(describedBy.split(' ').at(-1)!)?.textContent).toBe('Required');
	expect(host.querySelectorAll('se-field input')).toHaveLength(1);
	expect(host.querySelector('se-masked-input')!.hasAttribute('aria-invalid')).toBe(false);
});

test('a reset clears the visible masked input', async () => {
	const { host, field } = await mount(masked);
	const input = host.querySelector<HTMLInputElement>('se-masked-input input')!;
	await expect.poll(() => host.querySelector('se-masked-input[data-ready]')).toBeTruthy();

	await userEvent.type(input, '12345');
	await expect.poll(() => input.value).toBe('123-45');
	expect(formOf(field).getValue('zip')).toBe('123-45');

	formOf(field).reset();

	await expect.poll(() => input.value).toBe('');
	expect(formOf(field).getValue('zip') ?? '').toBe('');
});

test('a programmatic write reaches the visible phone number', async () => {
	const { host, field } = await mount(phone);
	await expect.poll(() => host.querySelector('se-phone-input[data-ready]')).toBeTruthy();

	formOf(field).setValue('contact', '+14155550123');

	const number = host.querySelector<HTMLInputElement>('se-phone-input [data-ref="number"]')!;
	await expect.poll(() => number.value).toBe('(415) 555-0123');
	expect(host.querySelector('se-phone-input')!.getAttribute('data-country')).toBe('US');
});

test('a reset clears the visible phone number', async () => {
	const { host, field } = await mount(phone);
	await expect.poll(() => host.querySelector('se-phone-input[data-ready]')).toBeTruthy();
	const number = host.querySelector<HTMLInputElement>('se-phone-input [data-ref="number"]')!;
	await userEvent.type(number, '4155550123');
	await expect.poll(() => number.value).toBe('(415) 555-0123');
	expect(formOf(field).getValue('contact')).toBe('+14155550123');

	formOf(field).reset();

	await expect.poll(() => number.value).toBe('');
	expect(formOf(field).getValue('contact') ?? '').toBe('');
});

test('a reset clears the OTP slots', async () => {
	const { host, field } = await mount(otp);
	const slots = () => Array.from(host.querySelectorAll<HTMLInputElement>('se-input-otp input'));
	await userEvent.type(slots()[0]!, '123');
	await expect
		.poll(() =>
			slots()
				.map((slot) => slot.value)
				.join(''),
		)
		.toBe('123');
	expect(formOf(field).getValue('code')).toBe('123');

	formOf(field).reset();

	await expect
		.poll(() =>
			slots()
				.map((slot) => slot.value)
				.join(''),
		)
		.toBe('');
	expect(formOf(field).getValue('code') ?? '').toBe('');
});

test.each([
	['masked-input', { ...masked, unmask: true }, 'se-masked-input input', '12345', 'zip'],
	['otp', otp, 'se-input-otp input', '123456', 'code'],
] as const)('a %s takes part in native form data', async (_name, element, selector, typed, name) => {
	const { host } = await mount(element);
	const form = host.querySelector('form')!;
	await expect.poll(() => host.querySelector('se-masked-input[data-ready], se-input-otp')).toBeTruthy();
	await userEvent.type(host.querySelector<HTMLInputElement>(selector)!, typed);

	await expect.poll(() => new FormData(form).get(name)).toBe(typed);
});

test('a phone input submits its E.164 number in native form data', async () => {
	const { host } = await mount(phone);
	await expect.poll(() => host.querySelector('se-phone-input[data-ready]')).toBeTruthy();
	await userEvent.type(host.querySelector<HTMLInputElement>('se-phone-input [data-ref="number"]')!, '4155550123');

	await expect.poll(() => new FormData(host.querySelector('form')!).get('contact')).toBe('+14155550123');
});

test('a programmatic write reaches the visible masked input and the OTP slots', async () => {
	const masked_ = await mount(masked);
	await expect.poll(() => masked_.host.querySelector('se-masked-input[data-ready]')).toBeTruthy();
	formOf(masked_.field).setValue('zip', '12345');
	await expect
		.poll(() => masked_.host.querySelector<HTMLInputElement>('se-masked-input input')!.value)
		.toBe('123-45');
	document.body.replaceChildren();

	const code = await mount(otp);
	formOf(code.field).setValue('code', '123456');
	await expect
		.poll(() =>
			Array.from(code.host.querySelectorAll<HTMLInputElement>('se-input-otp input'))
				.map((slot) => slot.value)
				.join(''),
		)
		.toBe('123456');
});

test('the default masked value is submitted masked', async () => {
	const { host } = await mount(masked);
	await expect.poll(() => host.querySelector('se-masked-input[data-ready]')).toBeTruthy();
	await userEvent.type(host.querySelector<HTMLInputElement>('se-masked-input input')!, '12345');

	await expect.poll(() => new FormData(host.querySelector('form')!).get('zip')).toBe('123-45');
});

test('a drop zone stores its files and a reset clears them and the file input', async () => {
	const { host, field } = await mount({ $type: 'drop-zone', id: 'upload', name: 'upload', label: 'Upload' });
	const input = host.querySelector<HTMLInputElement>('se-drop-zone input[type="file"]')!;
	const transfer = new DataTransfer();
	transfer.items.add(new File(['hello'], 'hello.txt', { type: 'text/plain' }));

	input.files = transfer.files;
	input.dispatchEvent(new Event('change', { bubbles: true }));

	await expect
		.poll(() => (formOf(field).getValue('upload') as File[]).map((file) => file.name))
		.toEqual(['hello.txt']);

	formOf(field).reset();

	await expect.poll(() => input.files?.length).toBe(0);
	expect(formOf(field).getValue('upload') ?? []).toEqual([]);
});

test('a field observes no mutations and resyncs once for each custom control it holds', async () => {
	const observed: Node[] = [];
	const NativeObserver = window.MutationObserver;
	window.MutationObserver = class extends NativeObserver {
		override observe(target: Node, options?: MutationObserverInit) {
			observed.push(target);
			super.observe(target, options);
		}
	};
	const resync = vi.spyOn(FormFieldElement.prototype, 'resyncControl');
	try {
		const { host } = await mount(otp);
		await expect
			.poll(() => host.querySelector('se-input-otp [data-ref="group"]')?.getAttribute('aria-labelledby'))
			.toBeTruthy();
		await userEvent.type(host.querySelector<HTMLInputElement>('se-input-otp input')!, '1');

		expect(observed.some((target) => target instanceof Element && target.closest('se-field'))).toBe(false);
		expect(resync).toHaveBeenCalledTimes(1);
	} finally {
		window.MutationObserver = NativeObserver;
	}
});
