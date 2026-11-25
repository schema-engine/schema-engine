import type { CheckoutContext } from './actions';

/** Waits `ms`, and rejects as soon as `signal` aborts, as a real client does when its request is cancelled. */
function delay(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		signal.addEventListener(
			'abort',
			() => {
				clearTimeout(timer);
				reject(new DOMException('The operation was aborted.', 'AbortError'));
			},
			{ once: true },
		);
	});
}

/** What a fake shop holds: the services of a checkout, what is left in stock and what left the shop, in order. */
export interface FakeShop {
	context: CheckoutContext;
	stock: Record<string, number>;
	sent: string[];
}

/**
 * Fake services for the checkout: an inventory of `stock`, a card that pays up to `cardLimit`, and a warehouse, an
 * analytics client and a mailer that record what they were asked to send.
 *
 * @remarks
 * The warehouse and the analytics client take time and give up when their signal aborts, which is what lets a
 * declined card cancel them.
 */
export function createFakeShop(stock: Record<string, number>, cardLimit: number): FakeShop {
	const sent: string[] = [];
	const context: CheckoutContext = {
		inventory: {
			reserve: async (sku, quantity) => {
				const left = stock[sku] ?? 0;
				if (left < quantity) return { ok: false, left };
				stock[sku] = left - quantity;
				return { ok: true };
			},
		},
		payments: {
			charge: async (amount, { signal }) => {
				await delay(10, signal);
				return { approved: amount <= cardLimit };
			},
		},
		warehouse: {
			notify: async ({ signal }) => {
				await delay(50, signal);
				sent.push('warehouse');
			},
		},
		analytics: {
			track: async (event, { signal }) => {
				await delay(50, signal);
				sent.push(`analytics:${event}`);
			},
		},
		mailer: {
			sendReceipt: async (to) => {
				sent.push(`receipt:${to}`);
			},
		},
	};
	return { context, stock, sent };
}
