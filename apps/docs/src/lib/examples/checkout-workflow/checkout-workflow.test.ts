import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { runCheckout } from './checkout';
import { createFakeShop } from './shop.helper';
import { checkoutWorkflow } from './workflow';

const order = { sku: 'tee-black-m', quantity: 2, amount: 120, email: 'ada@example.com' };
const shop = (stock = 10) => createFakeShop({ 'tee-black-m': stock }, 500);
const outline = (results: Array<{ actionId: string; status: string; groupIndex?: number }>) =>
	results.map(({ actionId, status, groupIndex }) => [actionId, status, groupIndex]);

beforeEach(() => {
	vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.resetModules();
});

describe('the checkout workflow', () => {
	test('reserves stock, runs the group together, then sends the receipt, with results in configuration order', async () => {
		const { context, stock, sent } = shop();
		const checkout = await runCheckout(checkoutWorkflow(order), context);

		expect(checkout.success && outline(checkout.results)).toEqual([
			['reserve', 'succeeded', undefined],
			['charge', 'succeeded', 0],
			['warehouse', 'succeeded', 1],
			['track', 'succeeded', 2],
			['receipt', 'succeeded', undefined],
		]);
		expect(stock).toEqual({ 'tee-black-m': 8 });
		expect(sent).toEqual(['warehouse', 'analytics:purchase', 'receipt:ada@example.com']);
	});

	test('a declined card cancels the rest of its group through the signal and runs no later entry', async () => {
		const { context, stock, sent } = shop();
		const checkout = await runCheckout(checkoutWorkflow({ ...order, amount: 900 }), context);

		expect(checkout.success && outline(checkout.results)).toEqual([
			['reserve', 'succeeded', undefined],
			['charge', 'failed', 0],
			['warehouse', 'cancelled', 1],
			['track', 'cancelled', 2],
		]);
		expect(checkout.success && checkout.results[1]).toMatchObject({
			error: 'The card was declined',
			shouldContinue: false,
		});
		expect(sent).toEqual([]);
		expect(stock).toEqual({ 'tee-black-m': 8 });
	});

	test('not enough stock stops the workflow before the card is charged', async () => {
		const { context, sent } = shop(1);
		const checkout = await runCheckout(checkoutWorkflow(order), context);

		expect(checkout.success && outline(checkout.results)).toEqual([['reserve', 'failed', undefined]]);
		expect(checkout.success && checkout.results[0]?.error).toBe('Only 1 of tee-black-m left');
		expect(sent).toEqual([]);
	});

	test('a bad entry is reported with its path and nothing runs, not even the valid entries', async () => {
		const { context, stock } = shop();
		const text = checkoutWorkflow({ ...order, quantity: 'two' as never, email: 'not-an-email' });
		const checkout = await runCheckout(text, context);

		expect(checkout).toEqual({
			success: false,
			issues: ['[0].quantity: Invalid input: expected number, received string', '[2].to: Invalid email address'],
		});
		expect(stock).toEqual({ 'tee-black-m': 10 });
	});

	test('an unknown action and text that is not JSON are issues', async () => {
		expect(await runCheckout('[{ "id": "refund", "$type": "refundCard" }]', shop().context)).toEqual({
			success: false,
			issues: ["[0].$type: No registration for $type 'refundCard'. Register it in the action registry."],
		});
		expect(await runCheckout('[', shop().context)).toEqual({
			success: false,
			issues: ['The workflow is not valid JSON.'],
		});
	});
});

describe('the example run', () => {
	test('prints the output the page shows', async () => {
		const lines: string[] = [];
		vi.spyOn(console, 'log').mockImplementation((line: string) => void lines.push(line));
		await import('./main');
		const page = readFileSync(
			join(import.meta.dirname, '../../../content/docs/examples/checkout-workflow.mdx'),
			'utf8',
		);
		expect(lines.join('\n')).toBe(page.match(/```text\n([\s\S]*?)\n```/)?.[1]);
	});
});
