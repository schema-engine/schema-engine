import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { containerOf, mountField as mount } from './mount-field';

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

test('a phone input labels its number input and leaves the host free of ARIA', async () => {
	const { host } = await mount({ ...phone, label: 'Mobile phone' });
	await expect.poll(() => host.querySelector('se-phone-input[data-ready]')).toBeTruthy();

	await expect.element(page.getByRole('textbox', { name: /^Mobile phone/ })).toBeInTheDocument();
	const phoneHost = host.querySelector('se-phone-input')!;
	expect(phoneHost.hasAttribute('aria-labelledby')).toBe(false);
	expect(phoneHost.hasAttribute('aria-invalid')).toBe(false);
});

test.each([
	['masked-input', masked, 'se-masked-input input'],
	['phone-input', phone, 'se-phone-input [data-ref="number"]'],
])('a %s keeps the same input when its field becomes invalid', async (_name, element, selector) => {
	const { host } = await mount({ ...element, rules: [{ type: 'required', message: 'Required' }] });
	await expect.poll(() => host.querySelector('se-field')?.querySelector(selector)?.id).toBeTruthy();
	const input = host.querySelector<HTMLInputElement>(selector)!;
	input.focus();

	await userEvent.tab();

	await expect.poll(() => input.getAttribute('aria-invalid')).toBe('true');
	expect(host.querySelector(selector)).toBe(input);
});

test('a reset clears the visible masked input', async () => {
	const { host, field } = await mount(masked);
	const input = host.querySelector<HTMLInputElement>('se-masked-input input')!;
	await expect.poll(() => host.querySelector('se-masked-input[data-ready]')).toBeTruthy();

	await userEvent.type(input, '12345');
	await expect.poll(() => input.value).toBe('123-45');
	expect(containerOf(field).getValue('zip')).toBe('123-45');

	containerOf(field).reset();

	await expect.poll(() => input.value).toBe('');
	expect(containerOf(field).getValue('zip') ?? '').toBe('');
});

test('a programmatic write reaches the visible phone number', async () => {
	const { host, field } = await mount(phone);
	await expect.poll(() => host.querySelector('se-phone-input[data-ready]')).toBeTruthy();

	containerOf(field).setValue('contact', '+14155550123');

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
	expect(containerOf(field).getValue('contact')).toBe('+14155550123');

	containerOf(field).reset();

	await expect.poll(() => number.value).toBe('');
	expect(containerOf(field).getValue('contact') ?? '').toBe('');
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
	expect(containerOf(field).getValue('code')).toBe('123');

	containerOf(field).reset();

	await expect
		.poll(() =>
			slots()
				.map((slot) => slot.value)
				.join(''),
		)
		.toBe('');
	expect(containerOf(field).getValue('code') ?? '').toBe('');
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
	containerOf(masked_.field).setValue('zip', '12345');
	await expect
		.poll(() => masked_.host.querySelector<HTMLInputElement>('se-masked-input input')!.value)
		.toBe('123-45');
	document.body.replaceChildren();

	const code = await mount(otp);
	containerOf(code.field).setValue('code', '123456');
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
		.poll(() => (containerOf(field).getValue('upload') as File[]).map((file) => file.name))
		.toEqual(['hello.txt']);

	containerOf(field).reset();

	await expect.poll(() => input.files?.length).toBe(0);
	expect(containerOf(field).getValue('upload') ?? []).toEqual([]);
});

test('a field observes no mutations and leaves every custom control host free of ARIA', async () => {
	const observed: Node[] = [];
	const NativeObserver = window.MutationObserver;
	window.MutationObserver = class extends NativeObserver {
		override observe(target: Node, options?: MutationObserverInit) {
			observed.push(target);
			super.observe(target, options);
		}
	};
	try {
		const { host } = await mount(otp);
		const group = () => host.querySelector('se-input-otp [data-ref="group"]');
		await expect.poll(() => group()?.getAttribute('aria-labelledby')).toBeTruthy();
		await userEvent.type(host.querySelector<HTMLInputElement>('se-input-otp input')!, '1');

		expect(observed.some((target) => target instanceof Element && target.closest('se-field'))).toBe(false);
		const otpHost = host.querySelector('se-input-otp')!;
		expect(otpHost.hasAttribute('id')).toBe(false);
		expect(otpHost.hasAttribute('aria-labelledby')).toBe(false);
		expect(group()?.id).toBe(host.querySelector('se-field label')?.getAttribute('for'));
	} finally {
		window.MutationObserver = NativeObserver;
	}
});

/** Counts the `input` and `change` events a host dispatches on itself. */
function watchEvents(host: Element) {
	const seen: string[] = [];
	for (const type of ['input', 'change', 'rui-change']) {
		host.addEventListener(type, (event) => {
			if (event.target === host) seen.push(type);
		});
	}
	return seen;
}

test('a masked input fires input per typed character, change once on commit and nothing for a programmatic write', async () => {
	const { host, field } = await mount(masked);
	await expect.poll(() => host.querySelector('se-masked-input[data-ready]')).toBeTruthy();
	const control = host.querySelector('se-masked-input')!;
	const seen = watchEvents(control);

	containerOf(field).setValue('zip', '99999');
	await expect.poll(() => host.querySelector<HTMLInputElement>('se-masked-input input')!.value).toBe('999-99');
	expect(seen).toEqual([]);

	const input = host.querySelector<HTMLInputElement>('se-masked-input input')!;
	await userEvent.clear(input);
	seen.length = 0;
	await userEvent.type(input, '123');
	await userEvent.tab();

	expect(seen.filter((type) => type === 'input')).toHaveLength(3);
	expect(seen.filter((type) => type === 'change')).toHaveLength(1);
	expect(seen).not.toContain('rui-change');
});

test('a drop zone fires input and change once for a pick and nothing for a reset', async () => {
	const { host, field } = await mount({ $type: 'drop-zone', id: 'upload', name: 'upload', label: 'Upload' });
	const seen = watchEvents(host.querySelector('se-drop-zone')!);
	const input = host.querySelector<HTMLInputElement>('se-drop-zone input[type="file"]')!;
	const transfer = new DataTransfer();
	transfer.items.add(new File(['hello'], 'hello.txt', { type: 'text/plain' }));

	input.files = transfer.files;
	input.dispatchEvent(new Event('change', { bubbles: true }));
	await expect.poll(() => seen).toEqual(['input', 'change']);

	containerOf(field).reset();
	await expect.poll(() => input.files?.length).toBe(0);
	expect(seen).toEqual(['input', 'change']);
});

test('a phone input fires input per typed digit and change once on commit, and a programmatic write fires nothing', async () => {
	const { host, field } = await mount(phone);
	await expect.poll(() => host.querySelector('se-phone-input[data-ready]')).toBeTruthy();
	const seen = watchEvents(host.querySelector('se-phone-input')!);
	const number = host.querySelector<HTMLInputElement>('se-phone-input [data-ref="number"]')!;

	containerOf(field).setValue('contact', '+14155550123');
	await expect.poll(() => number.value).toBe('(415) 555-0123');
	expect(seen).toEqual([]);

	await userEvent.clear(number);
	seen.length = 0;
	await userEvent.type(number, '4155550');
	await userEvent.tab();

	expect(seen.filter((type) => type === 'input').length).toBeGreaterThan(0);
	expect(seen.filter((type) => type === 'change')).toHaveLength(1);
	expect(seen).not.toContain('rui-change');
});

test('a phone input takes its country from the select and fires input and change', async () => {
	const { host, field } = await mount({ ...phone, defaultValue: '+14155550123' });
	await expect.poll(() => host.querySelector('se-phone-input[data-ready]')).toBeTruthy();
	const control = host.querySelector('se-phone-input')!;
	const seen = watchEvents(control);
	const select = control.querySelector('rui-select')!;

	select.value = ['GB'];
	select.dispatchEvent(new Event('change', { bubbles: true }));

	await expect.poll(() => control.getAttribute('data-country')).toBe('GB');
	expect(seen).toEqual(['input', 'change']);
	expect(String(containerOf(field).getValue('contact'))).toMatch(/^\+44/);
});
