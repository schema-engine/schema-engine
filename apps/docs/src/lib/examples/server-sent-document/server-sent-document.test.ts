import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { loadDocument } from './client';
import { GET, orderDocument, type Order } from './server';

const answer = (response: () => Response) => async () => response();
/** The client talking to the route handler, without a network. */
const server: typeof fetch = async (url, init) => GET(new Request(url, init));

describe('the design system files', () => {
	test.each(['components.ts', 'design-system.ts'])('%s is the file of the design system example', (file) => {
		const own = readFileSync(join(import.meta.dirname, file), 'utf8');
		const original = readFileSync(join(import.meta.dirname, '../design-system-registry', file), 'utf8');
		expect(own).toBe(original);
	});
});

describe('loadDocument', () => {
	test('renders the nodes it knows and reports the ones it does not, each with its path', async () => {
		const result = await loadDocument('https://shop.example/orders/1043', server);
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
		const result = await loadDocument('https://shop.example/orders/1042', server);
		expect(result.success && result.html).toHaveLength(2);
		expect(result.success && result.issues.map(({ path }) => path)).toEqual([
			[1, 'tone'],
			[2, '$type'],
		]);
	});

	test('asks for JSON and gives the request the url it was called with', async () => {
		const request = vi.fn(server);
		await loadDocument('https://shop.example/orders/1042', request);
		expect(request).toHaveBeenCalledWith('https://shop.example/orders/1042', {
			headers: { Accept: 'application/json' },
		});
	});

	test('a network failure, a status that is not a success and a body that is not JSON are results', async () => {
		expect(
			await loadDocument('/x', async () => {
				throw new TypeError('Failed to fetch');
			}),
		).toEqual({ success: false, error: 'The server could not be reached.' });
		expect(await loadDocument('https://shop.example/orders/9', server)).toEqual({
			success: false,
			error: 'The server answered 404.',
		});
		expect(
			await loadDocument(
				'/x',
				answer(() => new Response('', { status: 503 })),
			),
		).toEqual({
			success: false,
			error: 'The server answered 503.',
		});
		expect(
			await loadDocument(
				'/x',
				answer(() => new Response('<html>')),
			),
		).toEqual({
			success: false,
			error: 'The answer is not JSON.',
		});
	});

	test('a body that is not a document is one issue', async () => {
		const result = await loadDocument(
			'/x',
			answer(() => Response.json({ $type: 'badge' })),
		);
		expect(result).toEqual({
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
		expect(lines.join('\n')).toBe(page.match(/```text\n([\s\S]*?)\n```/)?.[1]);
	});
});
