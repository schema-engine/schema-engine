import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { GET } from './server';
import { ServerDocument } from './server-document.react';

let root: Root | undefined;
let host: HTMLElement;

/** The client talking to the route handler of `server.ts`, without a network. */
const network = vi.fn<typeof fetch>(async (input, init) => {
	const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
	return GET(new Request(new URL(href, location.origin), init));
});

beforeEach(() => {
	vi.stubGlobal('fetch', network);
	host = document.body.appendChild(document.createElement('div'));
	host.id = 'root';
});

afterEach(() => {
	root?.unmount();
	root = undefined;
	host.remove();
	network.mockClear();
	vi.unstubAllGlobals();
	vi.resetModules();
});

function mount(url: string) {
	const mounted = createRoot(host);
	root = mounted;
	flushSync(() => mounted.render(createElement(ServerDocument, { url })));
}

describe('ServerDocument', () => {
	test('shows a message while the document loads, then draws it and the issues of its bad nodes', async () => {
		mount('https://shop.example/orders/1042');
		expect(host.textContent).toBe('Loading the page');

		await expect
			.poll(() => host.querySelector('.callout')?.textContent)
			.toBe('Order 1042 confirmed Thanks for shopping with us.');
		expect(host.querySelector('a.button')?.getAttribute('href')).toBe('/parcels/1042');
		expect([...host.querySelectorAll('[role="alert"] li')].map((item) => item.textContent)).toEqual([
			'1.tone: Invalid option: expected one of "info"|"success"|"danger"',
			"2.$type: No registration for $type 'countdown'.",
		]);
	});

	test('asks for JSON, with a signal it aborts when the component unmounts', async () => {
		mount('https://shop.example/orders/1043');
		await expect.poll(() => host.querySelector('.badge')?.textContent).toBe('Paid');

		const [url, init] = network.mock.calls[0]!;
		expect(url).toBe('https://shop.example/orders/1043');
		expect(init?.headers).toEqual({ Accept: 'application/json' });
		root?.unmount();
		root = undefined;
		expect(init?.signal?.aborted).toBe(true);
	});

	test('a status that is not a success is a message', async () => {
		mount('https://shop.example/orders/9');
		await expect
			.poll(() => host.querySelector('[role="alert"]')?.textContent)
			.toBe('The page could not be loaded.');
	});

	test('a network failure and a body that is not JSON are the same message', async () => {
		vi.stubGlobal('fetch', async () => {
			throw new TypeError('Failed to fetch');
		});
		mount('/x');
		await expect.poll(() => host.textContent).toBe('The page could not be loaded.');

		root?.unmount();
		vi.stubGlobal('fetch', async () => new Response('<html>'));
		mount('/y');
		await expect.poll(() => host.textContent).toBe('The page could not be loaded.');
	});

	test('a new url starts loading again', async () => {
		mount('https://shop.example/orders/1043');
		await expect.poll(() => host.querySelector('.badge')).not.toBeNull();

		root?.render(createElement(ServerDocument, { url: 'https://shop.example/orders/9' }));
		await expect
			.poll(() => host.querySelector('[role="alert"]')?.textContent)
			.toBe('The page could not be loaded.');
		expect(host.querySelector('.badge')).toBeNull();
	});
});

describe('main', () => {
	test('draws the page into #root through the local server', async () => {
		vi.stubGlobal('fetch', fetch);
		await import('./main.react');

		await expect.poll(() => host.querySelector('.callout')?.textContent).toContain('Order 1042 confirmed');
	});
});
