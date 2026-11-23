import { createElement } from 'react';
import { createRoot as createReactRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { GET, POST } from './server';
import { mountSignupForm } from './server-driven-form.radiant';
import { SignupForm } from './server-driven-form.react';

let root: Root | undefined;

/** The client talking to the route handlers of `server.ts`, without a network. */
const network = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
	const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
	const request = new Request(new URL(href, location.origin), init);
	return init?.method === 'POST' ? POST(request) : GET(request);
});

beforeEach(() => {
	const meta = document.createElement('meta');
	meta.name = 'csrf-token';
	meta.content = 'token-1042';
	document.head.append(meta);
	vi.stubGlobal('fetch', network);
});

afterEach(() => {
	root?.unmount();
	root = undefined;
	document.body.replaceChildren();
	document.head.querySelector('meta[name="csrf-token"]')?.remove();
	network.mockClear();
	vi.unstubAllGlobals();
});

interface Driver {
	mount(path: string, onSignedUp: () => void): Promise<HTMLElement>;
	choose(host: HTMLElement, value: string): Promise<void>;
}

const react: Driver = {
	async mount(path, onSignedUp) {
		const host = document.createElement('div');
		document.body.append(host);
		root = createReactRoot(host);
		root.render(createElement(SignupForm, { url: path, onSignedUp }));
		await expect.poll(() => host.querySelector('form, [role="alert"]')).toBeTruthy();
		return host;
	},
	async choose(host, value) {
		await userEvent.selectOptions(host.querySelector<HTMLSelectElement>('select[name="plan"]')!, value);
	},
};

const radiant: Driver = {
	async mount(path, onSignedUp) {
		const host = document.createElement('div');
		document.body.append(host);
		await mountSignupForm(host, path, onSignedUp);
		await expect.poll(() => host.querySelector('input[name="email"], [role="alert"]')).toBeTruthy();
		return host;
	},
	async choose(host, value) {
		await userEvent.click(host.querySelector<HTMLElement>('[data-select-trigger]')!);
		await userEvent.click(host.querySelector<HTMLElement>(`[data-value="${value}"]`)!);
	},
};

async function fillIn(host: HTMLElement, driver: Driver, username: string) {
	await userEvent.type(host.querySelector('input[name="email"]')!, 'grace@example.com');
	await userEvent.type(host.querySelector('input[name="username"]')!, username);
	await driver.choose(host, 'team');
}

describe.each([
	['React', react],
	['Radiant', radiant],
])('the %s server-driven form', (_renderer, driver) => {
	test('renders the form the server sent, and an empty submit shows its messages without a request', async () => {
		const host = await driver.mount('/forms/signup', vi.fn());
		expect(network).toHaveBeenCalledTimes(1);

		await userEvent.click(host.querySelector('button[type="submit"]')!);

		await expect.poll(() => host.textContent).toContain('Enter your email');
		expect(host.textContent).toContain('Choose a username');
		expect(host.textContent).toContain('Choose a plan');
		expect(network).toHaveBeenCalledTimes(1);
	});

	test('a valid submit posts JSON with the CSRF header the engine adds, and calls onSignedUp', async () => {
		const onSignedUp = vi.fn();
		const host = await driver.mount('/forms/signup', onSignedUp);

		await fillIn(host, driver, 'grace');
		await userEvent.click(host.querySelector('button[type="submit"]')!);

		await expect.poll(() => onSignedUp.mock.calls.length).toBe(1);
		const post = network.mock.calls.find(([, init]) => init?.method === 'POST')!;
		expect(JSON.parse(post[1]!.body as string)).toEqual({
			email: 'grace@example.com',
			username: 'grace',
			plan: 'team',
		});
		expect(new Headers(post[1]!.headers).get('X-CSRF-Token')).toBe('token-1042');
	});

	test('a 422 shows the server message on the username field and does not call onSignedUp', async () => {
		const onSignedUp = vi.fn();
		const host = await driver.mount('/forms/signup', onSignedUp);

		await fillIn(host, driver, 'ada');
		await userEvent.click(host.querySelector('button[type="submit"]')!);

		await expect.poll(() => host.textContent).toContain('That username is already taken');
		expect(onSignedUp).not.toHaveBeenCalled();
	});

	test('a config the client cannot render shows its issues with their paths instead of a form', async () => {
		const host = await driver.mount('/forms/signup?next', vi.fn());

		expect(host.querySelector('form')).toBeNull();
		expect(host.querySelector('[role="alert"]')?.textContent).toContain(
			'steps.0.elements.4.$type: Unknown element type',
		);
	});
});
