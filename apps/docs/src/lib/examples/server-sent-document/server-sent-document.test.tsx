/** @jsxImportSource react */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { formatHtml } from '../../../../test/format-html';
import { GET, orderDocument, type Order } from './server';
import { DocumentView } from './server-document.react';

const sent = async (number: number): Promise<unknown> =>
	GET(new Request(`https://shop.example/orders/${number}`)).json();

const markup = (nodes: unknown) => renderToStaticMarkup(<DocumentView nodes={nodes} />);

describe('DocumentView', () => {
	test('draws the nodes it knows, and the issues of each node it cannot, in its place and with its path', async () => {
		expect(markup(await sent(1042))).toBe(
			[
				'<aside class="callout callout-success"><strong>Order 1042 confirmed</strong> <span>Thanks for shopping with us.</span></aside>',
				'<ul role="alert"><li>[1].tone: Invalid option: expected one of &quot;info&quot;|&quot;success&quot;|&quot;danger&quot;</li></ul>',
				'<ul role="alert"><li>[2].$type: No registration for $type &#x27;countdown&#x27;.</li></ul>',
				'<a class="button button-primary" href="/parcels/1042">Track parcel</a>',
			].join(''),
		);
	});

	test('a document that is not a list of nodes is one issue', () => {
		expect(markup({ $type: 'badge' })).toBe('<ul role="alert"><li>A document is a list of nodes.</li></ul>');
	});

	test('a node that is not an object is an issue at its index, and one without a $type at its $type', () => {
		expect(markup([null, { label: 'x' }])).toBe(
			'<ul role="alert"><li>[0]: Expected an object with a string $type.</li></ul>' +
				'<ul role="alert"><li>[1].$type: Expected a string $type.</li></ul>',
		);
	});

	test('a link target that is not a path or an http(s) URL is an issue, not a link', () => {
		const html = markup([{ $type: 'button', label: 'Go', href: 'javascript:alert(1)' }]);
		expect(html).toContain('[0].href: Use a path or an http(s) URL');
		expect(html).not.toContain('<a');
	});

	test('draws the output the page shows', async () => {
		const page = readFileSync(
			join(import.meta.dirname, '../../../content/docs/examples/server-sent-document.mdx'),
			'utf8',
		);
		const shown = [...page.matchAll(/```html\n([\s\S]*?)\n```/g)].map(([, code]) => code);
		expect(shown).toEqual([await formatHtml(markup(await sent(1042)))]);
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

	test('answers 404 for an order it does not know', () => {
		expect(GET(new Request('https://shop.example/orders/9')).status).toBe(404);
	});
});
