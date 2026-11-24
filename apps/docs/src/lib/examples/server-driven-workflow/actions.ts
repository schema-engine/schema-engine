import * as z from 'zod/mini';
import { ActionRegistry, defineAction, type ActionConfigBase } from '@schema-engine/actions';

z.config(z.locales.en());

/** What the actions of a checkout read and change. A test, or another runtime, passes its own. */
export interface CheckoutContext {
	stock: Record<string, number>;
	cardLimit: number;
	/** What left the shop, in order: the warehouse, the analytics and the mailer. */
	sent: string[];
}

export type CheckoutTrigger = 'change' | 'submit';

/** Waits `ms`, and rejects as soon as `signal` aborts, so a cancelled action stops waiting. */
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

const define = defineAction<CheckoutContext, CheckoutTrigger>();

const entry = {
	id: z.string(),
	enabled: z.optional(z.boolean()),
	triggers: z.optional(z.array(z.string())),
};

interface ReserveStockConfig extends ActionConfigBase<'reserveStock'> {
	sku: string;
	quantity: number;
}

const reserveStock = define<ReserveStockConfig>({
	$type: 'reserveStock',
	schema: z.object({
		...entry,
		$type: z.literal('reserveStock'),
		sku: z.string(),
		quantity: z.number().check(z.int(), z.positive()),
	}),
	metadata: { name: 'Reserve stock', defaultTriggers: ['submit'] },
	execute: async ({ config, stock }) => {
		const left = stock[config.sku] ?? 0;
		if (left < config.quantity) {
			return { success: false, error: `Only ${left} of ${config.sku} left`, shouldContinue: false };
		}
		stock[config.sku] = left - config.quantity;
		return { success: true, message: `Reserved ${config.quantity} of ${config.sku}` };
	},
});

interface ChargeCardConfig extends ActionConfigBase<'chargeCard'> {
	amount: number;
}

const chargeCard = define<ChargeCardConfig>({
	$type: 'chargeCard',
	schema: z.object({ ...entry, $type: z.literal('chargeCard'), amount: z.number().check(z.positive()) }),
	metadata: { name: 'Charge the card', defaultTriggers: ['submit'] },
	execute: async ({ config, cardLimit, signal }) => {
		await delay(10, signal);
		if (config.amount > cardLimit) {
			return { success: false, error: 'The card was declined', shouldContinue: false };
		}
		return { success: true, message: `Charged ${config.amount}` };
	},
});

type NotifyWarehouseConfig = ActionConfigBase<'notifyWarehouse'>;

const notifyWarehouse = define<NotifyWarehouseConfig>({
	$type: 'notifyWarehouse',
	schema: z.object({ ...entry, $type: z.literal('notifyWarehouse') }),
	metadata: { name: 'Notify the warehouse', defaultTriggers: ['submit'] },
	execute: async ({ sent, signal }) => {
		await delay(50, signal);
		sent.push('warehouse');
		return { success: true, message: 'Warehouse notified' };
	},
});

interface TrackPurchaseConfig extends ActionConfigBase<'trackPurchase'> {
	event: string;
}

const trackPurchase = define<TrackPurchaseConfig>({
	$type: 'trackPurchase',
	schema: z.object({ ...entry, $type: z.literal('trackPurchase'), event: z.string() }),
	metadata: { name: 'Track the purchase', defaultTriggers: ['change', 'submit'] },
	execute: async ({ config, sent, signal }) => {
		await delay(50, signal);
		sent.push(`analytics:${config.event}`);
		return { success: true, message: `Tracked ${config.event}` };
	},
});

interface SendReceiptConfig extends ActionConfigBase<'sendReceipt'> {
	to: string;
}

const sendReceipt = define<SendReceiptConfig>({
	$type: 'sendReceipt',
	schema: z.object({ ...entry, $type: z.literal('sendReceipt'), to: z.email() }),
	metadata: { name: 'Send the receipt', defaultTriggers: ['submit'] },
	execute: async ({ config, sent }) => {
		sent.push(`receipt:${config.to}`);
		return { success: true, message: `Receipt sent to ${config.to}` };
	},
});

export const registry = new ActionRegistry<CheckoutContext, CheckoutTrigger>([
	reserveStock,
	chargeCard,
	notifyWarehouse,
	trackPurchase,
	sendReceipt,
]);
