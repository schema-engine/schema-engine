import * as z from 'zod/mini';
import { ActionRegistry, defineAction, type ActionConfigBase } from '@schema-engine/actions';

z.config(z.locales.en());

/**
 * The services the actions of a checkout call.
 *
 * @remarks
 * The actions pass their `signal` to the calls that wait, so a cancelled action stops waiting. An app passes clients
 * of its own services, and a test passes fakes.
 */
export interface CheckoutContext {
	inventory: { reserve(sku: string, quantity: number): Promise<{ ok: true } | { ok: false; left: number }> };
	payments: { charge(amount: number, options: { signal: AbortSignal }): Promise<{ approved: boolean }> };
	warehouse: { notify(options: { signal: AbortSignal }): Promise<void> };
	analytics: { track(event: string, options: { signal: AbortSignal }): Promise<void> };
	mailer: { sendReceipt(to: string): Promise<void> };
}

export type CheckoutTrigger = 'change' | 'submit';

const define = defineAction<CheckoutContext, CheckoutTrigger>();

interface ReserveStockConfig extends ActionConfigBase<'reserveStock'> {
	sku: string;
	quantity: number;
}

const reserveStock = define<ReserveStockConfig>({
	$type: 'reserveStock',
	schema: z.object({
		sku: z.string(),
		quantity: z.number().check(z.int(), z.positive()),
	}),
	metadata: { name: 'Reserve stock', defaultTriggers: ['submit'] },
	execute: async ({ config, inventory }) => {
		const reservation = await inventory.reserve(config.sku, config.quantity);
		if (!reservation.ok) {
			return { success: false, error: `Only ${reservation.left} of ${config.sku} left`, shouldContinue: false };
		}
		return { success: true, message: `Reserved ${config.quantity} of ${config.sku}` };
	},
});

interface ChargeCardConfig extends ActionConfigBase<'chargeCard'> {
	amount: number;
}

const chargeCard = define<ChargeCardConfig>({
	$type: 'chargeCard',
	schema: z.object({ amount: z.number().check(z.positive()) }),
	metadata: { name: 'Charge the card', defaultTriggers: ['submit'] },
	execute: async ({ config, payments, signal }) => {
		const { approved } = await payments.charge(config.amount, { signal });
		if (!approved) return { success: false, error: 'The card was declined', shouldContinue: false };
		return { success: true, message: `Charged ${config.amount}` };
	},
});

type NotifyWarehouseConfig = ActionConfigBase<'notifyWarehouse'>;

const notifyWarehouse = define<NotifyWarehouseConfig>({
	$type: 'notifyWarehouse',
	schema: z.object({}),
	metadata: { name: 'Notify the warehouse', defaultTriggers: ['submit'] },
	execute: async ({ warehouse, signal }) => {
		await warehouse.notify({ signal });
		return { success: true, message: 'Warehouse notified' };
	},
});

interface TrackPurchaseConfig extends ActionConfigBase<'trackPurchase'> {
	event: string;
}

const trackPurchase = define<TrackPurchaseConfig>({
	$type: 'trackPurchase',
	schema: z.object({ event: z.string() }),
	metadata: { name: 'Track the purchase', defaultTriggers: ['change', 'submit'] },
	execute: async ({ config, analytics, signal }) => {
		await analytics.track(config.event, { signal });
		return { success: true, message: `Tracked ${config.event}` };
	},
});

interface SendReceiptConfig extends ActionConfigBase<'sendReceipt'> {
	to: string;
}

const sendReceipt = define<SendReceiptConfig>({
	$type: 'sendReceipt',
	schema: z.object({ to: z.email() }),
	metadata: { name: 'Send the receipt', defaultTriggers: ['submit'] },
	execute: async ({ config, mailer }) => {
		await mailer.sendReceipt(config.to);
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
