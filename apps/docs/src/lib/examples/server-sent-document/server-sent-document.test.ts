import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { outputBlocks } from '../../../../test/format-html';
import { loadDocument } from './client';
import { GET, orderDocument, type Order } from './server';

/** The client talking to the route handler, without a network. */
const server: typeof fetch = async (url, init) => GET(new Request(url, init));

describe('loadDocument', () => {
	beforeEach(() => void vi.stubGlobal('fetch', vi.fn(server)));
	afterEach(() => void vi.unstubAllGlobals());

	test('renders the nodes it knows and reports the ones it does not, each with its path', async () => {
		const result = await loadDocument('https://shop.example/orders/1043');
		expect(result).toEqual({
			success: true,
			html: [
				'<aside class="callout callout-success"><strong>Order 1043 confirmed</strong> <span>Thanks for shopping with us.</span></aside>',
				'<span class="badge badge-success">Paid</span>',
			],
			issues: [{ message: "No component is registered for $type 'countdown'.", path: [2, '$type'] }],
		});
	});

	test('an invalid config is an issue at its field, and the rest still renders', async () => {
		const result = await loadDocument('https://shop.example/orders/1042');
		expect(result.success && result.html).toHaveLength(2);
		expect(result.success && result.issues.map(({ path }) => path)).toEqual([
			[1, 'tone'],
			[2, '$type'],
		]);
	});

	test('asks for JSON and gives fetch the url it was called with', async () => {
		await loadDocument('https://shop.example/orders/1042');
		expect(fetch).toHaveBeenCalledWith('https://shop.example/orders/1042', {
			headers: { Accept: 'application/json' },
		});
	});

	test('a status that is not a success is a result', async () => {
		expect(await loadDocument('https://shop.example/orders/9')).toEqual({
			success: false,
			error: 'The server answered 404.',
		});
		vi.stubGlobal('fetch', async () => new Response('', { status: 503 }));
		expect(await loadDocument('/x')).toEqual({ success: false, error: 'The server answered 503.' });
	});

	test('a network failure and a body that is not JSON throw', async () => {
		vi.stubGlobal('fetch', async () => {
			throw new TypeError('Failed to fetch');
		});
		await expect(loadDocument('/x')).rejects.toThrow('Failed to fetch');
		vi.stubGlobal('fetch', async () => new Response('<html>'));
		await expect(loadDocument('/x')).rejects.toThrow(SyntaxError);
	});

	test('a body that is not a document is one issue', async () => {
		vi.stubGlobal('fetch', async () => Response.json({ $type: 'badge' }));
		expect(await loadDocument('/x')).toEqual({
			success: true,
			html: [],
			issues: [{ message: 'A document is a list of nodes.', path: [] }],
		});
	});
});

const types = (order: Order) => orderDocument(order).map((node) => (node as { $type: string }).$type);

describe('the server', () => {
	test('adds the tracking link only when the order has one', () => {
		expect(types({ number: 7, paid: true })).toEqual(['callout', 'badge', 'countdown']);
		expect(types({ number: 7, paid: true, trackingUrl: '/parcels/7' })).toEqual([
			'callout',
			'badge',
			'countdown',
			'button',
		]);
	});
});

describe('the example run', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetModules();
	});

	test('prints the output the page shows', async () => {
		const lines: string[] = [];
		vi.spyOn(console, 'log').mockImplementation((line: string) => void lines.push(line));
		await import('./main');
		const page = readFileSync(
			join(import.meta.dirname, '../../../content/docs/examples/server-sent-document.mdx'),
			'utf8',
		);
		const shown = [...page.matchAll(/```(html|text)\n([\s\S]*?)\n```/g)].map(([, lang, code]) => ({ lang, code }));
		expect(await outputBlocks(lines)).toEqual(shown.slice(0, 2));
	});
});
