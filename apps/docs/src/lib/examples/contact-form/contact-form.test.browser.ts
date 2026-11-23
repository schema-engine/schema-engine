import { createElement } from 'react';
import { createRoot as createReactRoot, type Root } from 'react-dom/client';
import { createRoot as createRadiantRoot } from '@ecopages/jsx/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { ContactForm as ReactContactForm } from './contact-form.react';
import { ContactForm as RadiantContactForm } from './contact-form.radiant';

let root: Root | undefined;

afterEach(() => {
	root?.unmount();
	root = undefined;
	document.body.replaceChildren();
	vi.unstubAllGlobals();
});

interface Driver {
	mount(onSent: () => void): Promise<HTMLElement>;
	/** Picks a subject, the way a visitor does: a native select in React, the Radiant select's listbox in Radiant. */
	choose(host: HTMLElement, value: string): Promise<void>;
}

const react: Driver = {
	async mount(onSent) {
		const host = document.createElement('div');
		document.body.append(host);
		root = createReactRoot(host);
		root.render(createElement(ReactContactForm, { onSent }));
		await expect.poll(() => host.querySelector('form')).toBeTruthy();
		return host;
	},
	async choose(host, value) {
		await userEvent.selectOptions(host.querySelector<HTMLSelectElement>('select[name="subject"]')!, value);
	},
};

const radiant: Driver = {
	async mount(onSent) {
		const host = document.createElement('div');
		document.body.append(host);
		createRadiantRoot(host).render(RadiantContactForm({ onSent }));
		await expect.poll(() => host.querySelector('input[name="name"]')).toBeTruthy();
		return host;
	},
	async choose(host, value) {
		await userEvent.click(host.querySelector<HTMLElement>('[data-select-trigger]')!);
		await userEvent.click(host.querySelector<HTMLElement>(`[data-value="${value}"]`)!);
	},
};

/** A field a constraint hides is absent in React and hidden in Radiant. */
const shown = (host: HTMLElement, selector: string) => {
	const element = host.querySelector(selector);
	return element !== null && element.closest('[hidden]') === null;
};

async function fillIn(host: HTMLElement, driver: Driver) {
	await userEvent.type(host.querySelector('input[name="name"]')!, 'Ada Lovelace');
	await userEvent.type(host.querySelector('input[name="email"]')!, 'ada@example.com');
	await driver.choose(host, 'general');
	await userEvent.type(host.querySelector('textarea[name="message"]')!, 'Hello there, team.');
}

describe.each([
	['React', react],
	['Radiant', radiant],
])('the %s contact form', (_renderer, driver) => {
	test('an empty submit shows the message of each visible required field and sends nothing', async () => {
		const send = vi.fn();
		vi.stubGlobal('fetch', send);
		const onSent = vi.fn();
		const host = await driver.mount(onSent);

		await userEvent.click(host.querySelector('button[type="submit"]')!);

		await expect.poll(() => host.textContent).toContain('Enter your name');
		expect(host.textContent).toContain('Enter your email');
		expect(host.textContent).toContain('Choose a subject');
		expect(host.textContent).toContain('Write a message');
		expect(host.textContent).not.toContain('Enter your ticket number');
		expect(send).not.toHaveBeenCalled();
		expect(onSent).not.toHaveBeenCalled();
	});

	test('the ticket field appears for a support request and is required there', async () => {
		vi.stubGlobal('fetch', vi.fn());
		const host = await driver.mount(vi.fn());
		expect(shown(host, 'input[name="ticket"]')).toBe(false);

		await driver.choose(host, 'support');
		await expect.poll(() => shown(host, 'input[name="ticket"]')).toBe(true);

		await userEvent.click(host.querySelector('button[type="submit"]')!);
		await expect.poll(() => host.textContent).toContain('Enter your ticket number');
	});

	test('a valid submit posts the values and calls onSent', async () => {
		const send = vi.fn(async () => new Response(null, { status: 201 }));
		vi.stubGlobal('fetch', send);
		const onSent = vi.fn();
		const host = await driver.mount(onSent);

		await fillIn(host, driver);
		await userEvent.click(host.querySelector('button[type="submit"]')!);

		await expect.poll(() => onSent.mock.calls.length).toBe(1);
		expect(send).toHaveBeenCalledTimes(1);
		const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/api/contact');
		expect(JSON.parse(init.body as string)).toEqual({
			name: 'Ada Lovelace',
			email: 'ada@example.com',
			subject: 'general',
			message: 'Hello there, team.',
		});
	});

	test('a 422 puts the server message on its field and does not call onSent', async () => {
		const problem = {
			status: 422,
			errors: [{ pointer: '#/email', code: 'undeliverable', detail: 'This address cannot receive mail' }],
		};
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json(problem, { status: 422 })),
		);
		const onSent = vi.fn();
		const host = await driver.mount(onSent);

		await fillIn(host, driver);
		await userEvent.click(host.querySelector('button[type="submit"]')!);

		await expect.poll(() => host.textContent).toContain('This address cannot receive mail');
		expect(onSent).not.toHaveBeenCalled();
	});
});
