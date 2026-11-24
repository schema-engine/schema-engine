import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { CheckoutContext } from './actions';
import { loadWorkflow, runWorkflow } from './client';
import { GET } from './endpoint';

const server: typeof fetch = async (url, init) => GET(new Request(url, init));
const shop = (): CheckoutContext => ({ stock: { 'tee-black-m': 10 }, cardLimit: 500, sent: [] });
const answer = (response: () => Response) => async () => response();

beforeEach(() => {
	vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.resetModules();
});

describe('the action registrations', () => {
	test('are the file of the checkout workflow recipe', () => {
		const own = readFileSync(join(import.meta.dirname, 'actions.ts'), 'utf8');
		expect(own).toBe(readFileSync(join(import.meta.dirname, '../checkout-workflow/actions.ts'), 'utf8'));
	});
});

describe('a workflow that comes from an endpoint', () => {
	test('change runs only the entries that answer change, and submit the rest', async () => {
		const workflow = await loadWorkflow('https://shop.example/cart/workflow', server);
		if (!workflow.success) throw new Error(workflow.issues.join('\n'));
		const context = shop();

		const change = await runWorkflow(workflow.actions, 'change', context);
		expect(change.map(({ actionId, status }) => [actionId, status])).toEqual([['track-cart', 'succeeded']]);
		expect(context.sent).toEqual(['analytics:cart_changed']);
		expect(context.stock).toEqual({ 'tee-black-m': 10 });

		const submit = await runWorkflow(workflow.actions, 'submit', context);
		expect(submit.map(({ actionId, status }) => [actionId, status])).toEqual([
			['reserve', 'succeeded'],
			['charge', 'succeeded'],
			['warehouse', 'succeeded'],
			['track', 'succeeded'],
			['receipt', 'succeeded'],
		]);
		expect(context.sent).toEqual([
			'analytics:cart_changed',
			'warehouse',
			'analytics:purchase',
			'receipt:ada@example.com',
		]);
	});

	test('an entry disabled by the server does not run', async () => {
		const workflow = await loadWorkflow(
			'/workflow',
			answer(() =>
				Response.json([
					{ id: 'track', $type: 'trackPurchase', event: 'purchase', enabled: false },
					{ id: 'receipt', $type: 'sendReceipt', to: 'ada@example.com' },
				]),
			),
		);
		if (!workflow.success) throw new Error(workflow.issues.join('\n'));
		const results = await runWorkflow(workflow.actions, 'submit', shop());
		expect(results.map(({ actionId }) => actionId)).toEqual(['receipt']);
	});

	test('a workflow with an unknown action and a bad value reports both with their entry, and nothing is returned to run', async () => {
		const workflow = await loadWorkflow('https://shop.example/cart/workflow?next', server);
		expect(workflow).toEqual({
			success: false,
			issues: [
				"0.$type: Unknown action type 'scoreRisk'. Register it in the action registry.",
				'1.quantity: Invalid input: expected number, received string',
			],
		});
	});

	test('a network failure, an error status and a body that is not JSON are issues', async () => {
		expect(
			await loadWorkflow('/x', async () => {
				throw new TypeError('Failed to fetch');
			}),
		).toEqual({ success: false, issues: ['The server could not be reached.'] });
		expect(
			await loadWorkflow(
				'/x',
				answer(() => new Response('', { status: 502 })),
			),
		).toEqual({
			success: false,
			issues: ['The server answered 502.'],
		});
		expect(
			await loadWorkflow(
				'/x',
				answer(() => new Response('<html>')),
			),
		).toEqual({
			success: false,
			issues: ['The answer is not JSON.'],
		});
	});

	test('a body that is not a list of entries is an issue at its root', async () => {
		const workflow = await loadWorkflow(
			'/x',
			answer(() => Response.json({ $type: 'sendReceipt' })),
		);
		expect(workflow.success).toBe(false);
	});
});

describe('the example run', () => {
	test('prints the output the page shows', async () => {
		const lines: string[] = [];
		vi.spyOn(console, 'log').mockImplementation((line: string) => void lines.push(line));
		await import('./main');
		const page = readFileSync(
			join(import.meta.dirname, '../../../content/docs/examples/server-driven-workflow.mdx'),
			'utf8',
		);
		expect(lines.join('\n')).toBe(page.match(/```text\n([\s\S]*?)\n```/)?.[1]);
	});
});
