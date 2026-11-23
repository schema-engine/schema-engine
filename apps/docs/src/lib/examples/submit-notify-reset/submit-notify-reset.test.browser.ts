import { createElement } from 'react';
import { createRoot as createReactRoot, type Root } from 'react-dom/client';
import { createRoot as createRadiantRoot } from '@ecopages/jsx/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Newsletter as ReactNewsletter } from './submit-notify-reset.react';
import { Newsletter as RadiantNewsletter, showNotices } from './submit-notify-reset.radiant';

let root: Root | undefined;
let stopNotices: (() => void) | undefined;

afterEach(() => {
	root?.unmount();
	root = undefined;
	stopNotices?.();
	stopNotices = undefined;
	document.body.replaceChildren();
	vi.unstubAllGlobals();
});

interface Driver {
	mount(): Promise<HTMLElement>;
}

const react: Driver = {
	async mount() {
		const host = document.createElement('div');
		document.body.append(host);
		root = createReactRoot(host);
		root.render(createElement(ReactNewsletter));
		await expect.poll(() => host.querySelector('form')).toBeTruthy();
		return host;
	},
};

const radiant: Driver = {
	async mount() {
		const host = document.createElement('div');
		document.body.append(host);
		createRadiantRoot(host).render(RadiantNewsletter());
		stopNotices = showNotices(host);
		await expect.poll(() => host.querySelector('input[name="email"]')).toBeTruthy();
		return host;
	},
};

const status = (host: HTMLElement) => host.querySelector('output')?.textContent ?? '';

describe.each([
	['React', react],
	['Radiant', radiant],
])('the %s newsletter form', (_renderer, driver) => {
	test('an invalid submit shows the message, sends nothing and notifies nobody', async () => {
		const send = vi.fn();
		vi.stubGlobal('fetch', send);
		const host = await driver.mount();

		await userEvent.click(host.querySelector('button[type="submit"]')!);
		await expect.poll(() => host.textContent).toContain('Enter your email');

		await userEvent.type(host.querySelector('input[name="email"]')!, 'not-an-email');
		await userEvent.click(host.querySelector('button[type="submit"]')!);
		await expect.poll(() => host.textContent).toContain('Enter a valid email address');
		expect(send).not.toHaveBeenCalled();
		expect(status(host)).toBe('');
	});

	test('a valid submit sends the email, announces the success and clears the field', async () => {
		const send = vi.fn(async () => Response.json({ subscribed: true }));
		vi.stubGlobal('fetch', send);
		const host = await driver.mount();

		await userEvent.type(host.querySelector('input[name="email"]')!, 'ada@example.com');
		await userEvent.click(host.querySelector('button[type="submit"]')!);

		await expect.poll(() => status(host)).toBe('You are subscribed. Look out for the next update.');
		await expect.poll(() => host.querySelector<HTMLInputElement>('input[name="email"]')!.value).toBe('');
		expect(send).toHaveBeenCalledTimes(1);
		const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/api/subscriptions');
		expect(init.method).toBe('POST');
		expect((init.body as FormData).get('email')).toBe('ada@example.com');
	});

	test('a failed request announces the error and keeps what was typed', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('Server error', { status: 500 })),
		);
		const host = await driver.mount();

		await userEvent.type(host.querySelector('input[name="email"]')!, 'ada@example.com');
		await userEvent.click(host.querySelector('button[type="submit"]')!);

		await expect.poll(() => status(host)).toBe('We could not subscribe you. Try again in a moment.');
		expect(host.querySelector<HTMLInputElement>('input[name="email"]')!.value).toBe('ada@example.com');
	});
});
