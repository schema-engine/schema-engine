import { createElement } from 'react';
import { createRoot as createReactRoot, type Root } from 'react-dom/client';
import { createRoot as createRadiantRoot } from '@ecopages/jsx/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { RegistrationWizard as ReactWizard } from './registration-wizard.react';
import { RegistrationWizard as RadiantWizard } from './registration-wizard.radiant';

let root: Root | undefined;

afterEach(() => {
	root?.unmount();
	root = undefined;
	document.body.replaceChildren();
	vi.unstubAllGlobals();
});

interface Driver {
	mount(onRegistered: () => void): Promise<HTMLElement>;
	/** The submit button of the last step: React's own text, and the built-in recipe's text in Radiant. */
	finish: string;
	choose(host: HTMLElement, value: string): Promise<void>;
}

const react: Driver = {
	finish: 'Create account',
	async mount(onRegistered) {
		const host = document.createElement('div');
		document.body.append(host);
		root = createReactRoot(host);
		root.render(createElement(ReactWizard, { onRegistered }));
		await expect.poll(() => host.querySelector('form')).toBeTruthy();
		return host;
	},
	async choose(host, value) {
		await userEvent.selectOptions(host.querySelector<HTMLSelectElement>('select[name="role"]')!, value);
	},
};

const radiant: Driver = {
	finish: 'Submit',
	async mount(onRegistered) {
		const host = document.createElement('div');
		document.body.append(host);
		createRadiantRoot(host).render(RadiantWizard({ onRegistered }));
		await expect.poll(() => host.querySelector('input[name="email"]')).toBeTruthy();
		return host;
	},
	async choose(host, value) {
		await userEvent.click(host.querySelector<HTMLElement>('[data-select-trigger]')!);
		await userEvent.click(host.querySelector<HTMLElement>(`[data-value="${value}"]`)!);
	},
};

/** A field of another step is absent in React and hidden in Radiant. */
const shown = (host: HTMLElement, selector: string) => {
	const element = host.querySelector(selector);
	return element !== null && element.closest('[hidden]') === null;
};

const button = (host: HTMLElement, name: string) =>
	[...host.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === name)!;

async function completeAccount(host: HTMLElement) {
	await userEvent.type(host.querySelector('input[name="email"]')!, 'ada@example.com');
	await userEvent.type(host.querySelector('input[name="password"]')!, 'correct horse battery');
	await userEvent.click(button(host, 'Next'));
	await expect.poll(() => shown(host, 'input[name="name"]')).toBe(true);
}

async function completeProfile(host: HTMLElement, driver: Driver) {
	await userEvent.type(host.querySelector('input[name="name"]')!, 'Ada Lovelace');
	await driver.choose(host, 'developer');
	await userEvent.click(button(host, driver.finish));
}

describe.each([
	['React', react],
	['Radiant', radiant],
])('the %s registration wizard', (_renderer, driver) => {
	test('Next stays on the account step while its rules fail, and names each one', async () => {
		const host = await driver.mount(vi.fn());

		await userEvent.click(button(host, 'Next'));
		await expect.poll(() => host.textContent).toContain('Enter your email');
		expect(host.textContent).toContain('Choose a password');
		expect(shown(host, 'input[name="name"]')).toBe(false);

		await userEvent.type(host.querySelector('input[name="email"]')!, 'ada@example.com');
		await userEvent.type(host.querySelector('input[name="password"]')!, 'short');
		await userEvent.click(button(host, 'Next'));
		await expect.poll(() => host.textContent).toContain('Use at least 12 characters');
		expect(shown(host, 'input[name="name"]')).toBe(false);
	});

	test('Previous keeps what was typed on the earlier step', async () => {
		const host = await driver.mount(vi.fn());
		await completeAccount(host);

		await userEvent.click(button(host, 'Previous'));
		await expect.poll(() => shown(host, 'input[name="email"]')).toBe(true);
		expect(host.querySelector<HTMLInputElement>('input[name="email"]')!.value).toBe('ada@example.com');
		expect(host.querySelector<HTMLInputElement>('input[name="password"]')!.value).toBe('correct horse battery');
	});

	test('the last step submits the values of both steps and calls onRegistered', async () => {
		const send = vi.fn(async () => new Response(null, { status: 201 }));
		vi.stubGlobal('fetch', send);
		const onRegistered = vi.fn();
		const host = await driver.mount(onRegistered);

		await completeAccount(host);
		await completeProfile(host, driver);

		await expect.poll(() => onRegistered.mock.calls.length).toBe(1);
		const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/api/accounts');
		expect(JSON.parse(init.body as string)).toEqual({
			email: 'ada@example.com',
			password: 'correct horse battery',
			name: 'Ada Lovelace',
			role: 'developer',
		});
	});

	test('a 409 on the email moves the wizard back to the step that holds the field', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(null, { status: 409 })),
		);
		const onRegistered = vi.fn();
		const host = await driver.mount(onRegistered);

		await completeAccount(host);
		await completeProfile(host, driver);

		await expect.poll(() => host.textContent).toContain('An account with this email already exists');
		expect(shown(host, 'input[name="email"]')).toBe(true);
		expect(onRegistered).not.toHaveBeenCalled();
	});
});
