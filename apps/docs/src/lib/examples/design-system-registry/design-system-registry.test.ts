import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { brandButton } from './brand-button';
import { badge, button, callout, defaults } from './components';
import { createDesignSystem, renderDocument } from './design-system';

const system = createDesignSystem();

describe('the design system registry', () => {
	test('holds the three components by $type, in order, with their metadata', () => {
		expect(system.keys()).toEqual(['button', 'badge', 'callout']);
		expect(system.get('callout')?.metadata).toMatchObject({ name: 'Callout', tags: ['status'] });
		expect(defaults).toEqual([button, badge, callout]);
	});

	test('a later registration overrides a default and keeps its position, and the defaults stay untouched', () => {
		const brand = createDesignSystem([brandButton]);
		expect(brand.keys()).toEqual(['button', 'badge', 'callout']);
		expect(brand.get('button')?.metadata.name).toBe('Brand button');
		expect(system.get('button')?.metadata.name).toBe('Button');
	});

	test('a registration whose schema is not a Standard Schema fails the build and names its $type', () => {
		expect(() => createDesignSystem([{ ...button, $type: 'link', schema: {} as never }])).toThrow(
			"Component 'link' schema must implement Standard Schema",
		);
	});
});

describe('renderDocument', () => {
	test('renders each node with its component', () => {
		const { html, issues } = renderDocument(system, [
			{ $type: 'callout', tone: 'success', title: 'Order 1042 confirmed', text: 'Thanks.' },
			{ $type: 'badge', label: 'Paid' },
			{ $type: 'button', label: 'View order', href: '/orders/1042', variant: 'secondary' },
			{ $type: 'button', label: 'Reorder' },
		]);
		expect(issues).toEqual([]);
		expect(html).toEqual([
			'<aside class="callout callout-success"><strong>Order 1042 confirmed</strong> <span>Thanks.</span></aside>',
			'<span class="badge badge-info">Paid</span>',
			'<a class="button button-secondary" href="/orders/1042">View order</a>',
			'<button type="button" class="button button-primary">Reorder</button>',
		]);
	});

	test('escapes the text of a node, so a document cannot inject markup', () => {
		const { html } = renderDocument(system, [{ $type: 'badge', label: '<img src=x onerror="alert(1)">' }]);
		expect(html).toEqual(['<span class="badge badge-info">&#60;img src=x onerror=&#34;alert(1)&#34;&#62;</span>']);
	});

	test('reports an unknown $type and an invalid config at their node, and still renders the rest', () => {
		const { html, issues } = renderDocument(system, [
			{ $type: 'badge', label: 5 },
			{ $type: 'chip', label: 'Shipping soon' },
			{ $type: 'button', label: 'Cancel', href: 'javascript:alert(1)' },
			{ $type: 'badge', label: 'Paid', tone: 'success' },
			'not a node',
		]);
		expect(html).toEqual(['<span class="badge badge-success">Paid</span>']);
		expect(issues.map(({ path, message }) => [path, message])).toEqual([
			[[0, 'label'], 'Invalid input: expected string, received number'],
			[[1, '$type'], "No component is registered for $type 'chip'."],
			[[2, 'href'], 'Use a path or an http(s) URL'],
			[[4], 'A node is an object with a string $type.'],
		]);
	});

	test('a document that is not a list is one issue', () => {
		expect(renderDocument(system, { $type: 'badge' })).toEqual({
			html: [],
			issues: [{ message: 'A document is a list of nodes.', path: [] }],
		});
	});

	test('the override renders its own markup and keeps the safety rule of the default', () => {
		const brand = createDesignSystem([brandButton]);
		const { html, issues } = renderDocument(brand, [
			{ $type: 'button', label: 'View order', href: '/orders/1042' },
			{ $type: 'button', label: 'Cancel', href: 'javascript:alert(1)' },
		]);
		expect(html).toEqual(['<a class="brand-button" href="/orders/1042">View order</a>']);
		expect(issues.map(({ path }) => path)).toEqual([[1, 'href']]);
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
			join(import.meta.dirname, '../../../content/docs/examples/design-system-registry.mdx'),
			'utf8',
		);
		const shown = page.match(/```text\n([\s\S]*?)\n```/)?.[1];
		expect(lines.join('\n')).toBe(shown);
	});
});
